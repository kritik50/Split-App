import { useEffect, useState } from "react";
import { ArrowLeftRight, X, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getBalancesSummary } from "../api/userApi";
import { createSettlement } from "../api/settlementApi";
import { useToast } from "../context/ToastContext.jsx";
import "./Balances.css";

const Balances = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Settle modal
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleError, setSettleError] = useState("");
  const [settling, setSettling] = useState(false);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getBalancesSummary();
      setBalances(res.data || []);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
      setError("Could not load balances right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBalances(); }, []);

  const openSettle = (balance) => {
    setSettleTarget(balance);
    setSettleAmount(String(Number(balance.amount).toFixed(2)));
    setSettleError("");
  };

  const closeSettle = () => {
    setSettleTarget(null);
    setSettleAmount("");
    setSettleError("");
  };

  const handleSettle = async () => {
    const amount = Number(settleAmount);
    if (!amount || amount <= 0) { setSettleError("Enter a valid amount."); return; }
    if (amount > Number(settleTarget.amount)) { setSettleError("Amount cannot exceed the balance."); return; }
    try {
      setSettling(true);
      await createSettlement({
        group_id: settleTarget.group_id,
        paid_to: settleTarget.counterparty_id,
        amount,
      });
      closeSettle();
      await fetchBalances();
      toast.success("Payment recorded!");
    } catch (err) {
      setSettleError(err?.response?.data?.detail || "Failed to settle.");
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="balances-page">
      <div className="balances-page__container">
        <header className="balances-page__header">
          <div>
            <h1>Balances</h1>
            <p>See who owes you and where you still need to settle up.</p>
          </div>
        </header>

        {loading ? (
          <div className="balances-page__list">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton balances-page__skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="balances-page__state balances-page__state--error">{error}</div>
        ) : balances.length === 0 ? (
          <div className="balances-page__state">
            <ArrowLeftRight size={22} />
            <h3>All settled up! 🎉</h3>
            <p>You have no outstanding balances right now.</p>
          </div>
        ) : (
          <div className="balances-page__list">
            {balances.map((balance, index) => (
              <article
                key={`${balance.group_id}-${balance.counterparty_id}-${index}`}
                className="balances-page__card"
              >
                <div className="balances-page__info">
                  <div className="balances-page__group">{balance.group_name}</div>
                  <h3>
                    {balance.direction === "you_owe"
                      ? <>You owe <strong>{balance.counterparty_name}</strong></>
                      : <><strong>{balance.counterparty_name}</strong> owes you</>}
                  </h3>
                </div>

                <div className="balances-page__side">
                  <div className={`balances-page__amount ${balance.direction === "you_owe" ? "balances-page__amount--owe" : "balances-page__amount--get"}`}>
                    ₹{Number(balance.amount).toFixed(2)}
                  </div>
                  <div className="balances-page__card-actions">
                    {balance.direction === "you_owe" && (
                      <button
                        className="balances-page__settle-btn"
                        onClick={() => openSettle(balance)}
                      >
                        Mark settled
                      </button>
                    )}
                    <button
                      className="balances-page__open"
                      onClick={() => navigate(`/group/${balance.group_id}`)}
                    >
                      Open Group
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settleTarget && (
        <div className="balances-page__modal-backdrop" onClick={closeSettle}>
          <div className="balances-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="balances-page__modal-header">
              <h3>Mark as Settled</h3>
              <button className="balances-page__modal-close" onClick={closeSettle}><X size={15} /></button>
            </div>
            <p className="balances-page__modal-hint">
              Record how much you paid to <strong>{settleTarget.counterparty_name}</strong> in <em>{settleTarget.group_name}</em>.
            </p>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={settleTarget.amount}
              className="balances-page__modal-input"
              value={settleAmount}
              onChange={(e) => { setSettleAmount(e.target.value); setSettleError(""); }}
              autoFocus
            />
            {settleError && (
              <div className="balances-page__modal-error">
                <AlertCircle size={13} /> {settleError}
              </div>
            )}
            <div className="balances-page__modal-note">
              Max: <strong>₹{Number(settleTarget.amount).toFixed(2)}</strong>
            </div>
            <div className="balances-page__modal-actions">
              <button className="balances-page__modal-cancel" onClick={closeSettle}>Cancel</button>
              <button className="balances-page__modal-confirm" onClick={handleSettle} disabled={settling}>
                {settling ? "Saving…" : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balances;
