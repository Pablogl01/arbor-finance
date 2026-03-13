import { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Pencil, 
  PlusCircle, 
  MinusCircle, 
  Banknote,
  Home,
  MonitorPlay,
  Trash2
} from 'lucide-react';
import { useAccounts, useAccountDetails } from '@/hooks/useAccounts';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  onTransactionAdded?: () => void;
}

export default function AccountModal({ isOpen, onClose, accountId, onTransactionAdded }: AccountModalProps) {
  const { accounts, createAccount, refresh: refreshAccounts } = useAccounts();
  const { transactions, recurring, loading: detailsLoading, addTransaction, addRecurringTransaction, updateRecurringTransaction, deleteTransaction, refresh: refreshDetails } = useAccountDetails(accountId);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingRecurring, setIsSubmittingRecurring] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('Efectivo');

  // Recurring form states
  const [showAddRecurringIncome, setShowAddRecurringIncome] = useState(false);
  const [showAddRecurringExpense, setShowAddRecurringExpense] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [recDay, setRecDay] = useState('1');

  const account = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);

  if (!isOpen) return null;

  const resetRecurringForm = () => {
    setRecName('');
    setRecAmount('');
    setRecFrequency('monthly');
    setRecDay('1');
    setEditingRecurringId(null);
  };

  const handleEditRecurringClick = (r: any, type: 'income' | 'expense') => {
    setRecName(r.name);
    setRecAmount(Math.abs(r.amount).toString());
    setRecFrequency(r.frequency);
    setRecDay(r.dayOfMonth ? r.dayOfMonth.toString() : r.dayOfWeek ? r.dayOfWeek.toString() : '1');
    setEditingRecurringId(r.id);
    if (type === 'income') {
      setShowAddRecurringExpense(false);
      setShowAddRecurringIncome(true);
    } else {
      setShowAddRecurringIncome(false);
      setShowAddRecurringExpense(true);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      setIsDeletingId(transactionId);
      await deleteTransaction(transactionId);
      refreshDetails();
      await refreshAccounts(); // Update account balance globally
      if (onTransactionAdded) {
        onTransactionAdded(); // Trigger re-render in summary cards
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleAddTransaction = async () => {
    if (!accountId || !concept || !amount) return;
    try {
      setIsSubmitting(true);
      const parsedAmount = Number(amount.replace(',', '.'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Cantidad inválida");
      }
      await addTransaction({
        accountId,
        concept,
        category,
        amount: parsedAmount,
        type: transactionType
      });
      setConcept('');
      setCategory('');
      setAmount('');
      refreshDetails(); // Reload local transactions
      await refreshAccounts(); // Force accounts (and balance) to update locally in the modal
      if (onTransactionAdded) {
        onTransactionAdded(); // Tell SummaryCards to update too
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRecurring = async (type: 'income' | 'expense') => {
    if (!accountId || !recName || !recAmount || (!addRecurringTransaction && !updateRecurringTransaction)) return;
    try {
      setIsSubmittingRecurring(true);
      
      const now = new Date();
      let nextDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
      
      if (recFrequency === 'monthly') {
        const d = Number(recDay) || 1;
        nextDate = new Date(now.getFullYear(), now.getMonth(), d);
        if (nextDate <= now) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, d);
        }
      } else if (recFrequency === 'weekly') {
        const targetDay = Number(recDay) || 1; // 1=Mon, 7=Sun
        const currentDay = now.getDay() === 0 ? 7 : now.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      }

      const parsedRecAmount = Math.abs(Number(recAmount.replace(',', '.')));
      if (isNaN(parsedRecAmount) || parsedRecAmount <= 0) {
        throw new Error("Cantidad inválida");
      }

      const txData = {
        name: recName,
        amount: type === 'expense' ? -parsedRecAmount : parsedRecAmount,
        frequency: recFrequency,
        dayOfMonth: recFrequency === 'monthly' ? Number(recDay) : undefined,
        dayOfWeek: recFrequency === 'weekly' ? Number(recDay) : undefined,
        nextDueDate: nextDate
      };

      if (editingRecurringId && updateRecurringTransaction) {
        // Remove undefined nulls for the update call
        const { ...updateData } = txData;
        await updateRecurringTransaction(editingRecurringId, updateData);
      } else if (addRecurringTransaction) {
        await addRecurringTransaction({
          accountId,
          ...txData,
          dayOfMonth: txData.dayOfMonth ?? undefined,
          dayOfWeek: txData.dayOfWeek ?? undefined,
        });
      }

      resetRecurringForm();
      setShowAddRecurringIncome(false);
      setShowAddRecurringExpense(false);
      refreshDetails();
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmittingRecurring(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="relative flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[24px] bg-white text-left shadow-2xl">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 rounded-full bg-arbor-bg p-2 text-arbor-textmuted transition-colors hover:bg-slate-200 hover:text-arbor-text"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto max-h-[90vh] p-8 custom-scrollbar">
          
          {/* Header & Summary */}
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-arbor-text">
                {account?.name ? `Gestión de Cuenta: ${account.name}` : accountId ? 'Cargando...' : 'Cuenta no configurada'}
              </h2>
              
              <div className="mt-6 inline-flex flex-col rounded-xl border border-arbor-green/10 bg-arbor-mint/30 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">Saldo Actual</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-arbor-green">
                    {formatCurrency(account?.balanceCache || 0)}
                  </span>
                  <span className="text-xs font-medium text-arbor-green/70">Saldo disponible</span>
                </div>
              </div>
            </div>

            {/* Mini Bar Chart Mockup (Static for now as we don't have historical balance yet) */}
            <div className="flex flex-col items-end pr-2">
              <span className="text-lg font-bold text-arbor-text">€4,500 / €3,200</span>
              <div className="mt-3 flex items-end gap-1.5 h-12">
                <div className="h-full w-5 rounded-t-sm bg-arbor-green" />
                <div className="h-[60%] w-5 rounded-t-sm bg-arbor-green/20" />
                <div className="h-[80%] w-5 rounded-t-sm bg-arbor-green/40" />
                <div className="h-[40%] w-5 rounded-t-sm bg-arbor-green/10" />
                <div className="h-[90%] w-5 rounded-t-sm bg-arbor-green" />
                <div className="h-[30%] w-5 rounded-t-sm bg-arbor-green/20" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10 lg:flex-row">
            
            {/* Main Left Column (Recurring) */}
            <div className="flex-1 flex flex-col gap-8">
              
              {/* Ingresos Recurrentes */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-arbor-text">
                    <Calendar className="h-4 w-4 text-arbor-textmuted" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Ingresos Recurrentes</h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (showAddRecurringIncome) {
                        setShowAddRecurringIncome(false);
                        resetRecurringForm();
                      } else {
                        setShowAddRecurringExpense(false);
                        resetRecurringForm();
                        setShowAddRecurringIncome(true);
                      }
                    }}
                    className="text-xs font-bold text-arbor-green hover:text-arbor-darkmint transition-colors"
                  >
                    {showAddRecurringIncome ? 'Cancelar' : '+ Añadir'}
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  {showAddRecurringIncome && (
                    <div className="rounded-xl border border-arbor-border bg-slate-50/50 p-4 shadow-sm flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={recName} onChange={(e) => setRecName(e.target.value)}
                        placeholder="Nombre (ej. Nómina)"
                        className="w-full rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                      />
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={recAmount} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9.,]*$/.test(val)) setRecAmount(val);
                          }}
                          placeholder="€"
                          className="w-1/3 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                        />
                        <select 
                          value={recFrequency} onChange={(e) => setRecFrequency(e.target.value as any)}
                          className="flex-1 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                        >
                          <option value="monthly">Mensual</option>
                          <option value="weekly">Semanal</option>
                          <option value="daily">Diario</option>
                        </select>
                        {recFrequency !== 'daily' && (
                          <input 
                            type="number" min="1" max={recFrequency === 'monthly' ? 31 : 7}
                            value={recDay} onChange={(e) => setRecDay(e.target.value)}
                            placeholder="Día"
                            className="w-1/4 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                          />
                        )}
                      </div>
                      <button 
                        onClick={() => handleAddRecurring('income')}
                        disabled={isSubmittingRecurring || !recName || !recAmount}
                        className="w-full rounded-lg bg-arbor-green py-2 text-xs font-bold text-white transition-colors hover:bg-arbor-darkmint disabled:opacity-50"
                      >
                        {isSubmittingRecurring ? 'Guardando...' : editingRecurringId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}
                      </button>
                    </div>
                  )}

                  {!showAddRecurringIncome && (
                    <div className="flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {recurring.filter(r => r.amount > 0).map(r => (
                        <div key={r.id} className="flex shrink-0 items-center justify-between rounded-xl bg-arbor-bg p-4 transition-colors hover:bg-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-arbor-mint text-arbor-green">
                              <Banknote className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-arbor-text">{r.name}</p>
                              <p className="text-xs text-arbor-textmuted">Recurrente {r.frequency}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-arbor-green">+{formatCurrency(r.amount)}</span>
                            <button 
                              onClick={() => handleEditRecurringClick(r, 'income')}
                              className="text-arbor-textmuted hover:text-arbor-text transition-colors"
                              title="Editar ingreso recurrente"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {recurring.filter(r => r.amount > 0).length === 0 && (
                        <p className="text-xs text-arbor-textmuted italic">No hay ingresos recurrentes configurados.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Gastos Recurrentes */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-arbor-text">
                    <Clock className="h-4 w-4 text-arbor-textmuted" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Gastos Recurrentes</h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (showAddRecurringExpense) {
                        setShowAddRecurringExpense(false);
                        resetRecurringForm();
                      } else {
                        setShowAddRecurringIncome(false);
                        resetRecurringForm();
                        setShowAddRecurringExpense(true);
                      }
                    }}
                    className="text-xs font-bold text-arbor-green hover:text-arbor-darkmint transition-colors"
                  >
                    {showAddRecurringExpense ? 'Cancelar' : '+ Añadir'}
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  {showAddRecurringExpense && (
                    <div className="rounded-xl border border-arbor-border bg-slate-50/50 p-4 shadow-sm flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={recName} onChange={(e) => setRecName(e.target.value)}
                        placeholder="Nombre (ej. Alquiler)"
                        className="w-full rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                      />
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={recAmount} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9.,]*$/.test(val)) setRecAmount(val);
                          }}
                          placeholder="€"
                          className="w-1/3 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                        />
                        <select 
                          value={recFrequency} onChange={(e) => setRecFrequency(e.target.value as any)}
                          className="flex-1 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                        >
                          <option value="monthly">Mensual</option>
                          <option value="weekly">Semanal</option>
                          <option value="daily">Diario</option>
                        </select>
                        {recFrequency !== 'daily' && (
                          <input 
                            type="number" min="1" max={recFrequency === 'monthly' ? 31 : 7}
                            value={recDay} onChange={(e) => setRecDay(e.target.value)}
                            placeholder="Día"
                            className="w-1/4 rounded-lg border border-arbor-border bg-white px-3 py-2 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-1 focus:ring-arbor-mint"
                          />
                        )}
                      </div>
                      <button 
                        onClick={() => handleAddRecurring('expense')}
                        disabled={isSubmittingRecurring || !recName || !recAmount}
                        className="w-full rounded-lg bg-arbor-text py-2 text-xs font-bold text-white transition-colors hover:bg-arbor-text/90 disabled:opacity-50"
                      >
                        {isSubmittingRecurring ? 'Guardando...' : editingRecurringId ? 'Actualizar Gasto' : 'Guardar Gasto'}
                      </button>
                    </div>
                  )}

                  {!showAddRecurringExpense && (
                    <div className="flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {recurring.filter(r => r.amount < 0).map(r => (
                        <div key={r.id} className="flex shrink-0 items-center justify-between rounded-xl bg-arbor-bg p-4 transition-colors hover:bg-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-micro">
                              <Home className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-arbor-text">{r.name}</p>
                              <p className="text-xs text-arbor-textmuted">Recurrente {r.frequency}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-arbor-text">-{formatCurrency(Math.abs(r.amount))}</span>
                            <button 
                              onClick={() => handleEditRecurringClick(r, 'expense')}
                              className="text-arbor-textmuted hover:text-arbor-text transition-colors"
                              title="Editar gasto recurrente"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {recurring.filter(r => r.amount < 0).length === 0 && (
                        <p className="text-xs text-arbor-textmuted italic">No hay gastos recurrentes configurados.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Right Sidebar (Manual Entry) */}
            <div className="w-full lg:w-[320px]">
              {accountId ? (
                <div className="rounded-[20px] bg-arbor-bg p-6">
                  <h3 className="mb-5 text-sm font-bold text-arbor-text">Movimiento Extraordinario</h3>
                  
                  {/* Toggle */}
                  <div className="mb-6 flex rounded-lg bg-slate-200/60 p-1">
                    <button 
                      onClick={() => setTransactionType('income')}
                      className={`flex-1 rounded-md py-2 text-xs font-bold transition-all ${
                        transactionType === 'income' 
                          ? 'bg-white text-arbor-green shadow-micro' 
                          : 'text-arbor-textmuted hover:text-arbor-text'
                      }`}
                    >
                      + Ingreso
                    </button>
                    <button 
                      onClick={() => setTransactionType('expense')}
                      className={`flex-1 rounded-md py-2 text-xs font-bold transition-all ${
                        transactionType === 'expense' 
                          ? 'bg-white text-arbor-text shadow-micro' 
                          : 'text-arbor-textmuted hover:text-arbor-text'
                      }`}
                    >
                      - Gasto
                    </button>
                  </div>

                  {/* Form */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">
                        Concepto
                      </label>
                      <input 
                        type="text" 
                        value={concept}
                        onChange={(e) => setConcept(e.target.value)}
                        placeholder="Ej: Venta artículo" 
                        className="w-full rounded-lg border border-arbor-border bg-white px-4 py-2.5 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">
                          Categoría
                        </label>
                        <input 
                          type="text" 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="(ej.) Cena" 
                          className="w-full rounded-lg border border-arbor-border bg-white px-4 py-2.5 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">
                          Cantidad (€)
                        </label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9.,]*$/.test(val)) setAmount(val);
                          }}
                          placeholder="0.00" 
                          className="w-full rounded-lg border border-arbor-border bg-white px-4 py-2.5 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleAddTransaction}
                      disabled={isSubmitting || !concept || !amount}
                      className="mt-2 w-full rounded-xl bg-gradient-to-b from-arbor-green to-[#043020] py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(6,64,43,0.39)] transition-all hover:translate-y-[-1px] hover:shadow-[0_6px_20px_rgba(6,64,43,0.35)] active:translate-y-[1px] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] bg-arbor-bg p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px] border border-dashed border-arbor-border">
                  <Banknote className="h-10 w-10 text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold text-arbor-text mb-1">Cuenta requerida</h3>
                  <p className="text-xs text-arbor-textmuted mb-5">Crea una cuenta de tipo &quot;cash&quot; en tu base de datos Supabase para habilitar los movimientos.</p>
                  
                  <div className="w-full max-w-[240px] mb-4">
                    <label className="mb-1.5 block text-left text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">
                      Nombre de la Cuenta
                    </label>
                    <input 
                      type="text" 
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Ej: Cuenta Corriente" 
                      className="w-full text-center rounded-lg border border-arbor-border bg-white px-4 py-2.5 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <button 
                    onClick={async () => {
                      if (!newAccountName.trim()) return;
                      try {
                        setIsSubmitting(true);
                        if (createAccount) {
                          await createAccount({ name: newAccountName, type: 'cash', strategy: 'none' });
                          window.location.reload();
                        }
                      } catch (e) {
                        console.error(e);
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting || !newAccountName.trim()}
                    className="rounded-xl bg-arbor-green px-6 py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-arbor-darkmint hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Cuenta Automáticamente'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* History Table (Bottom) */}
          <div className="mt-12 border-t border-arbor-border pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-arbor-text">Histórico Reciente de Manuales</h3>
              <button className="text-xs font-medium text-arbor-textmuted hover:text-arbor-text transition-colors">
                Ver todo el histórico
              </button>
            </div>

            <div className="flex flex-col max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions.map(tx => (
                <div key={tx.id} className="group flex items-center border-b border-arbor-border/50 py-4 last:border-0 shrink-0 transition-colors hover:bg-slate-50/50 rounded-lg px-2 -mx-2">
                  <span className="w-24 text-xs text-arbor-textmuted">
                    {tx.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex flex-1 items-center gap-3">
                    {tx.type === 'income' ? (
                      <PlusCircle className="h-4 w-4 text-arbor-green shrink-0" />
                    ) : (
                      <MinusCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-arbor-text line-clamp-1">{tx.concept}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-arbor-green' : 'text-arbor-textmuted'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button 
                      onClick={() => handleDeleteTransaction(tx.id)}
                      disabled={isDeletingId === tx.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="Eliminar movimiento"
                    >
                      {isDeletingId === tx.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-sm text-arbor-textmuted py-4">No hay movimientos registrados.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
