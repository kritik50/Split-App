import { useEffect, useState } from "react";
import { Activity as ActivityIcon, Receipt, CheckCircle2 } from "lucide-react";

import { getUserActivity } from "../api/userApi";
import "./Activity.css";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const Activity = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const res = await getUserActivity();
        const sorted = (res.data || []).sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setItems(sorted);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        setError("Could not load recent activity.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="activity-page">
      <div className="activity-page__container">
        <header className="activity-page__header">
          <h1>Activity</h1>
          <p>Latest expenses and settlements across your groups.</p>
        </header>

        {loading ? (
          <div className="activity-page__list">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton activity-page__skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="activity-page__state activity-page__state--error">{error}</div>
        ) : items.length === 0 ? (
          <div className="activity-page__state">
            <ActivityIcon size={22} />
            <h3>No activity yet</h3>
            <p>Your timeline will show expenses and settlements here.</p>
          </div>
        ) : (
          <div className="activity-page__list">
            {items.map((item) => {
              const isExpense    = item.type === "expense";
              const isSettlement = item.type === "settlement";
              const Icon = isExpense ? Receipt : CheckCircle2;

              return (
                <article
                  key={`${item.type}-${item.id}`}
                  className={`activity-page__card activity-page__card--${item.type}`}
                >
                  <div className={`activity-page__icon-wrap activity-page__icon-wrap--${item.type}`}>
                    <Icon size={15} />
                  </div>

                  <div className="activity-page__body">
                    <div className="activity-page__group">{item.group_name || `Group ${item.group_id}`}</div>
                    <h3>
                      {isExpense
                        ? <><strong>{item.paid_by}</strong> added <em>"{item.notes || "an expense"}"</em></>
                        : <><strong>{item.paid_by}</strong> settled with <strong>{item.paid_to}</strong></>
                      }
                    </h3>
                    <div className="activity-page__meta">{formatDate(item.created_at)}</div>
                  </div>

                  <div className={`activity-page__amount activity-page__amount--${item.type}`}>
                    ₹{Number(item.amount || 0).toFixed(2)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;
