import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

/**
 * Input com máscara dinâmica CPF/CNPJ
 * - < 12 caracteres: CPF (000.000.000-00)
 * - >= 12 caracteres: CNPJ (00.000.000/0000-00)
 */
const InputCpfCnpj = forwardRef(({ value = '', onChange, ...props }, ref) => {
  const [maskedValue, setMaskedValue] = useState('');

  useEffect(() => {
    const cleanValue = (value || '').replace(/\D/g, '');
    setMaskedValue(applyMask(cleanValue));
  }, [value]);

  const applyMask = (clean) => {
    if (clean.length <= 11) {
      // Máscara CPF: 000.000.000-00
      return clean
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Máscara CNPJ: 00.000.000/0000-00
      return clean
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '');
    const masked = applyMask(clean);
    setMaskedValue(masked);
    
    if (onChange) {
      onChange({ ...e, target: { ...e.target, value: clean } });
    }
  };

  return (
    <Input
      {...props}
      ref={ref}
      value={maskedValue}
      onChange={handleChange}
      placeholder={maskedValue.length > 14 ? "00.000.000/0000-00" : "000.000.000-00"}
    />
  );
});

InputCpfCnpj.displayName = "InputCpfCnpj";

export { InputCpfCnpj };