import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getBalancesSummary } from "../api/userApi";
import "./Balances.css";

const Balances = () => {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setLoading(true);
        const res = await getBalancesSummary();
        setBalances(res.data || []);
      } catch (err) {
        console.error("Failed to fetch balances:", err);
        setError("Could not load balances right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

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
            <h3>All settled up</h3>
            <p>You have no outstanding balances right now.</p>
          </div>
        ) : (
          <div className="balances-page__list">
            {balances.map((balance, index) => (
              <article key={`${balance.group_id}-${balance.counterparty_id}-${index}`} className="balances-page__card">
                <div>
                  <div className="balances-page__group">{balance.group_name}</div>
                  <h3>
                    {balance.direction === "you_owe"
                      ? `You owe ${balance.counterparty_name}`
                      : `${balance.counterparty_name} owes you`}
                  </h3>
                </div>

                <div className="balances-page__side">
                  <div className={`balances-page__amount ${balance.direction === "you_owe" ? "balances-page__amount--owe" : "balances-page__amount--get"}`}>
                    Rs{Number(balance.amount).toFixed(2)}
                  </div>
                  <button
                    className="balances-page__open"
                    onClick={() => navigate(`/group/${balance.group_id}`)}
                  >
                    Open Group
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Balances;
