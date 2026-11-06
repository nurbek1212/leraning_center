import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { getErrorMessage, post } from '../../api/client';
import Badge, { Tone } from '../../components/Badge';
import ClientTable from '../../components/ClientTable';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import PeriodPicker from '../../components/PeriodPicker';
import ProgressBar from '../../components/ProgressBar';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import type { CheckoutResult, MyPayments as MyPaymentsData, PaymentStatus } from '../../types';
import { currentPeriod, formatDate, formatMoney, paymentMethodLabels, paymentStatusLabels, periodLabel } from '../../utils/format';

const tone: Record<PaymentStatus, Tone> = { paid: 'green', pending: 'amber', cancelled: 'gray' };

export default function MyPayments() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState(currentPeriod());
  const { data, loading, error, reload } = useFetch<MyPaymentsData>('/payments/my', { period });
  const [paying, setPaying] = useState<string>(''); // "groupId:provider"

  // To'lov sahifasidan qaytganda holatni yangilaymiz (Payme/Click tasdig'i serverga biroz kechikib kelishi mumkin)
  useEffect(() => {
    if (!params.get('paid')) return;
    toast.success("To'lov tizimidan qaytdingiz. Holat yangilanmoqda...");
    const t = setTimeout(reload, 2500);
    setParams({}, { replace: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async (groupId: number, provider: 'payme' | 'click') => {
    setPaying(`${groupId}:${provider}`);
    try {
      const res = await post<CheckoutResult>('/payments/checkout', { groupId, period, provider });
      window.location.href = res.url; // to'lov tizimi sahifasiga o'tish
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPaying('');
    }
  };

  return (
    <div className="space-y-6">
      <PeriodPicker value={period} onChange={setPeriod} />
      <ErrorBox message={error} />

      {loading && !data ? (
        <Spinner />
      ) : data && data.groups.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Wallet size={26} />} title="Guruhingiz yo'q" text="Guruhga qo'shilgach, to'lovlar shu yerda ko'rinadi." />
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.groups.map((g) => {
                const done = g.price > 0 && g.debt <= 0;
                return (
                  <div key={g.group_id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{g.subject_name}</h3>
                        <p className="text-sm text-slate-500">{g.group_name}</p>
                      </div>
                      {done ? <Badge tone="green" dot>To'langan</Badge> : g.price > 0 ? <Badge tone="red">Qarz</Badge> : <Badge tone="gray">Narx belgilanmagan</Badge>}
                    </div>

                    {g.price > 0 && (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-400">Narx</p>
                            <p className="tabular font-semibold text-slate-900">{formatMoney(g.price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">To'langan</p>
                            <p className="tabular font-semibold text-emerald-600">{formatMoney(g.paid)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Qarz</p>
                            <p className={`tabular font-semibold ${g.debt > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatMoney(g.debt)}</p>
                          </div>
                        </div>
                        <ProgressBar className="mt-3" value={g.paid} max={g.price} />
                      </>
                    )}

                    {done && (
                      <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle2 size={16} /> {periodLabel(period)} uchun to'liq to'langan
                      </p>
                    )}

                    {g.debt > 0 && g.price > 0 && (
                      <div className="mt-4">
                        {data.providers.payme || data.providers.click ? (
                          <div className="flex flex-wrap gap-2">
                            {data.providers.payme && (
                              <button className="btn-primary flex-1" disabled={!!paying} onClick={() => pay(g.group_id, 'payme')}>
                                {paying === `${g.group_id}:payme` && <Loader2 size={16} className="animate-spin" />}
                                Payme bilan to'lash
                              </button>
                            )}
                            {data.providers.click && (
                              <button className="btn-secondary flex-1" disabled={!!paying} onClick={() => pay(g.group_id, 'click')}>
                                {paying === `${g.group_id}:click` && <Loader2 size={16} className="animate-spin" />}
                                Click bilan to'lash
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">Onlayn to'lov hozircha yoqilmagan. Administratorga naqd yoki karta orqali to'lashingiz mumkin.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-slate-900">{periodLabel(period)} — to'lovlar tarixi</h3>
              <ClientTable
                rows={data.history}
                rowKey={(h) => h.id}
                searchText={(h) => `${h.group_name} ${paymentMethodLabels[h.method]}`}
                searchPlaceholder="Guruh yoki usul..."
                emptyText="Bu oyda to'lov yo'q"
                columns={[
                  { header: 'Sana', cell: (h) => formatDate(h.paid_at ?? h.created_at) },
                  { header: 'Guruh', cell: (h) => h.group_name },
                  { header: 'Summa', cell: (h) => <span className="tabular">{formatMoney(h.amount)}</span> },
                  { header: 'Usul', cell: (h) => paymentMethodLabels[h.method] },
                  { header: 'Holat', cell: (h) => <Badge tone={tone[h.status]} dot>{paymentStatusLabels[h.status]}</Badge> },
                ]}
              />
            </div>
          </>
        )
      )}
    </div>
  );
}
