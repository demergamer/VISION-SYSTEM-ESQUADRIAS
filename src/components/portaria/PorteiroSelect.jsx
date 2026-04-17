import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PORTEIROS = ["Antonio Manoel", "Antonio Alves", "Cicero Bezerra", "Cristian de Oliveira"];
const COMBUSTIVEIS = ["Reserva", "1/4", "1/2", "3/4", "Cheio"];

export function PorteiroSelect({ value, onValueChange, placeholder = "Selecione o porteiro" }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {PORTEIROS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function CombustivelSelect({ value, onValueChange, placeholder = "Nível de combustível" }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {COMBUSTIVEIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}