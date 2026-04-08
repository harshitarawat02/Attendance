import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScan: (result: string) => void;
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          onScan(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        setError("Camera access denied or not available. Please grant camera permissions.");
        console.error("QR scanner error:", err);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="space-y-2">
      <div id={containerId} className="mx-auto max-w-sm overflow-hidden rounded-lg" />
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
