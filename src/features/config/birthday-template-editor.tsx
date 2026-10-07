'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { fetchBirthdaySettings, saveBirthdaySettings } from '@/services/settings.service';
import { fetchClientesConCumple } from '@/services/cumpleanos.service';
import { AVAILABLE_VARIABLES } from '@/lib/cumpleanos/plantilla';
import { getTodayInTimezone } from '@/lib/cumpleanos/fechas';
import { prepareCumpleMessage, type ClienteCumple } from '@/lib/cumpleanos/mensaje';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SAMPLE: ClienteCumple = {
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '351 555 1234',
  fecha_nacimiento: '1990-10-07',
};

export function BirthdayTemplateEditor() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const asesor = profile?.nombre ?? '';
  const today = useMemo(() => getTodayInTimezone(), []);

  const [template, setTemplate] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [sampleId, setSampleId] = useState<string>('');

  const settingsQuery = useQuery({
    queryKey: ['birthday-settings'],
    queryFn: () => fetchBirthdaySettings(createClient()),
  });

  // Carga inicial de los campos cuando llega la configuración guardada.
  useEffect(() => {
    if (settingsQuery.data) {
      setTemplate(settingsQuery.data.template);
      setEmpresa(settingsQuery.data.empresa);
    }
  }, [settingsQuery.data]);

  const clientesQuery = useQuery({
    queryKey: ['cumpleanos-clientes'],
    queryFn: () => fetchClientesConCumple(createClient()),
  });

  const sampleCliente: ClienteCumple = useMemo(() => {
    const found = clientesQuery.data?.find((c) => c.id === sampleId);
    return found ?? clientesQuery.data?.[0] ?? SAMPLE;
  }, [clientesQuery.data, sampleId]);

  const previewMessage = useMemo(
    () =>
      prepareCumpleMessage({
        cliente: sampleCliente,
        template,
        empresa: empresa.trim() || settingsQuery.data?.empresa || '',
        asesor,
        today,
      }).message,
    [sampleCliente, template, empresa, asesor, today, settingsQuery.data?.empresa]
  );

  const save = useMutation({
    mutationFn: () =>
      saveBirthdaySettings(createClient(), {
        template: template.trim(),
        empresa: empresa.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['birthday-settings'] });
      toast.success('Plantilla guardada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 bg-panel2" />
        <Skeleton className="h-10 w-48 bg-panel2" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label htmlFor="empresa" className="text-ink-dim">
            Nombre de la empresa / aseguradora
          </Label>
          <Input
            id="empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ej: Seguros XYZ"
            className="mt-1 max-w-sm border-line bg-bg2"
          />
          <p className="mt-1 text-[11px] text-ink-faint">
            Se usa en la variable <code>{'{{empresa}}'}</code>.
          </p>
        </div>

        <div>
          <Label htmlFor="template" className="text-ink-dim">
            Plantilla de mensaje
          </Label>
          <Textarea
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={10}
            className="mt-1 border-line bg-bg2 font-mono text-sm"
          />
        </div>

        <div className="rounded-[3px] border border-line bg-panel2 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">
            Variables disponibles
          </p>
          <ul className="space-y-1 text-sm">
            {AVAILABLE_VARIABLES.map((v) => (
              <li key={v.key} className="flex gap-3">
                <code className="text-amber">{v.token}</code>
                <span className="text-ink-dim">{v.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          onClick={() => save.mutate()}
          disabled={!template.trim() || save.isPending}
          className="bg-amber text-[#1a1510]"
        >
          Guardar plantilla
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-ink-dim">Vista previa</Label>
          {!!clientesQuery.data?.length && (
            <Select value={sampleId || clientesQuery.data[0].id} onValueChange={setSampleId}>
              <SelectTrigger className="max-w-[220px] border-line bg-bg2 text-xs">
                <SelectValue placeholder="Cliente de ejemplo" />
              </SelectTrigger>
              <SelectContent>
                {clientesQuery.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${c.nombre} ${c.apellido}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="whitespace-pre-wrap rounded-[3px] border border-line bg-bg2 p-4 text-sm leading-relaxed text-ink">
          {previewMessage || (
            <span className="text-ink-faint">Escribí una plantilla para ver la vista previa.</span>
          )}
        </div>
        <p className="text-[11px] text-ink-faint">
          Ejemplo con los datos de{' '}
          <b className="text-ink-dim">
            {`${sampleCliente.nombre} ${sampleCliente.apellido}`.trim()}
          </b>
          .
        </p>
      </div>
    </div>
  );
}
