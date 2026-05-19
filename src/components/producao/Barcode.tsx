import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value?: string | number;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  format?: 'CODE128' | 'CODE39' | 'EAN13';
}

export function Barcode({
  value,
  height = 30,
  width = 1.2,
  displayValue = true,
  fontSize = 10,
  format = 'CODE128',
}: BarcodeProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const v = value == null ? '' : String(value);
    if (!v) {
      ref.current.innerHTML = '';
      return;
    }
    try {
      JsBarcode(ref.current, v, {
        format,
        height,
        width,
        displayValue,
        fontSize,
        margin: 0,
        background: '#fff',
        lineColor: '#000',
        font: 'Courier New',
      });
    } catch {
      // valor inválido - apenas limpa
      ref.current.innerHTML = '';
    }
  }, [value, height, width, displayValue, fontSize, format]);
  return <svg ref={ref} className="op-barcode" />;
}
