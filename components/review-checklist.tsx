"use client";
import { useState } from "react";
export function ReviewChecklist({
  items,
}: {
  items: { title: string; detail: string }[];
}) {
  const [done, setDone] = useState<number[]>([]);
  return (
    <>
      <div className="panel-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#5f6f85",
            marginBottom: 10,
          }}
        >
          <span>Review progress</span>
          <span>
            {done.length} of {items.length}
          </span>
        </div>
        <progress
          aria-label="Checklist review progress"
          value={done.length}
          max={items.length}
          style={{ width: "100%", height: 4, accentColor: "#7d3548" }}
        />
      </div>
      <div className="checklist">
        {items.map((item, index) => (
          <label className="check-row" key={item.title}>
            <input
              type="checkbox"
              checked={done.includes(index)}
              onChange={(e) =>
                setDone(
                  e.target.checked
                    ? [...done, index]
                    : done.filter((i) => i !== index),
                )
              }
            />
            <div>
              <strong>{item.title}</strong>
              <span className="subtext">{item.detail}</span>
            </div>
          </label>
        ))}
      </div>
      <p className="guidance-source">
        Checklist progress is kept while this page is open; it is not saved.
      </p>
    </>
  );
}
