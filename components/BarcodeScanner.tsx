import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FoodResult, lookupBarcode } from '@/lib/foods';
import { useTheme } from '@/lib/theme';
import { Btn, T } from './ui';

/** Point the camera at a food barcode; calls onFound with the food (or tells you it wasn't found) */
export function BarcodeScanner({ onFound, onClose }: { onFound: (f: FoodResult) => void; onClose: () => void }) {
  const c = useTheme();
  const [perm, requestPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const lock = useRef(false);

  async function scanned(code: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMsg(null);
    try {
      const f = await lookupBarcode(code);
      if (f) { onFound(f); return; }
      setMsg(`Couldn't find barcode ${code}. Try searching the food by name, or use Quick add.`);
    } catch {
      setMsg("Couldn't look that up. Check your connection and try again.");
    } finally {
      setBusy(false);
      setTimeout(() => { lock.current = false; }, 1500);
    }
  }

  if (!perm) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
        <T bold size={18}>Scan food barcodes</T>
        <T muted>Spot Mates needs the camera to read barcodes. Nothing is recorded.</T>
        {perm.canAskAgain ? <Btn kind="primary" title="Allow camera" onPress={requestPerm} /> : <T muted>Turn on camera access for Expo Go in your iPhone's Settings, then come back.</T>}
        <Btn title="Back to search" onPress={onClose} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={{ flex: 1 }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={busy ? undefined : (r) => scanned(r.data)} />
      <View pointerEvents="none" style={{ position: 'absolute', top: '30%', left: '12%', right: '12%', height: 150, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 16, opacity: 0.85 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 32, gap: 10, backgroundColor: c.surface }}>
        {busy ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={c.muted} /><T>Looking it up…</T></View>
          : <T muted>{msg ?? 'Line up the barcode inside the box.'}</T>}
        <Btn title="Back to search" onPress={onClose} />
      </View>
    </View>
  );
}
