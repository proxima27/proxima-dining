import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, PenLine, MailOpen } from "lucide-react";
import { useStaff, names, errText } from "./Staff";
import { useData } from "../../services/hooks";
import { SectionHead, Status } from "../../components/Common";
export function Manage({ kind }) {
  const [rev, V] = useState(0),
    [q, Q] = useState(""),
    [msg, M] = useState(""),
    [opened, O] = useState(null);
  const { mutate, inbox, refreshInbox } = useStaff();
  const inboxVersion = kind === "messages" ? `${inbox?.total}:${inbox?.unread}:${inbox?.latest}` : "";
  const r = useData("/admin/" + kind, `${rev}:${inboxVersion}`);
  const msgList = kind === "messages",
    subs = kind === "newsletter",
    editable = !subs && !msgList;
  async function remove(x) {
    if (!confirm("Delete " + (x.name || x.email) + "? This cannot be undone."))
      return;
    try {
      await mutate("delete", kind + "/" + x.id);
      M("Record deleted.");
      O(null);
      if (msgList) refreshInbox();
      V(i => i + 1);
    } catch (e) {
      M(errText(e));
    }
  }
  async function read(x) {
    try {
      const response = await mutate("patch", "messages/" + x.id);
      O(response.data);
      refreshInbox();
      V(i => i + 1);
    } catch (e) {
      M(errText(e));
    }
  }
  const list = (r.data || []).filter((x) =>
    [x.name, x.email, x.subject, x.city]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  function csv() {
    const data =
      "email,status\r\n" +
      list
        .map(
          (x) =>
            '"' +
            (/^[=+@-]/.test(x.email) ? "'" : "") +
            x.email.replaceAll('"', '""') +
            '",' +
            (x.is_active ? "active" : "unsubscribed"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "proxima-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <SectionHead k={msgList ? "STAFF INBOX" : "CONTENT MANAGEMENT"} title={names[kind]} sub={msgList ? "Messages sent through the public contact form appear here, newest first. This inbox refreshes automatically." : undefined} />
      <div className="actionrow">
        <input
          aria-label={"Search " + names[kind]}
          placeholder="Search records…"
          value={q}
          onChange={(e) => Q(e.target.value)}
        />
        {msgList && <button className="btn" onClick={() => {refreshInbox(); V(i=>i+1)}}>Refresh inbox</button>}
        {editable && (
          <Link className="gold" to={"/admin/" + kind + "/new"}>
            <Plus size={15} />
            New record
          </Link>
        )}
        {subs && (
          <button className="btn" onClick={csv}>
            Export CSV
          </button>
        )}
      </div>
      <p role="status">{msg}</p>
      {!r.data ? (
        <Status r={r} />
      ) : !list.length ? (
        <div className="empty">{msgList && !q ? "No contact messages yet." : "No matching records."}</div>
      ) : (
        <div className="recordlist">
          {list.map((x) => (
            <div key={x.id}>
              {x.image_url && <img src={x.image_url} alt="" />}
              <div className="recordtext">
                <strong>{msgList ? x.subject : x.name || x.email}</strong>
                <small>
                  {msgList
                    ? x.name + " · " + (x.is_read ? "Read" : "Unread")
                    : subs
                      ? x.is_active
                        ? "Subscribed"
                        : "Unsubscribed"
                      : x.city || x.category || x.slug}
                  {x.is_published != null &&
                    " · " + (x.is_published ? "Published" : "Draft")}
                </small>
              </div>
              {editable && (
                <Link
                  className="btn"
                  to={"/admin/" + kind + "/" + x.id + "/edit"}
                  aria-label={"Edit " + x.name}
                >
                  <PenLine size={14} /> Edit
                </Link>
              )}
              {msgList && (
                <button className="btn" onClick={() => read(x)}>
                  Read
                </button>
              )}
              <button
                className="btn"
                aria-label={"Delete " + (x.name || x.email)}
                onClick={() => remove(x)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {opened && (
        <dialog open className="msgdetails">
          <h3>{opened.subject}</h3>
          <p>
            {opened.name} · {opened.email}
          </p>
          <p>{opened.message}</p>
          <button className="btn" onClick={() => O(null)}>
            Close
          </button>
        </dialog>
      )}
    </>
  );
}
export function Settings() {
  const r = useData("/admin/settings"),
    { mutate } = useStaff(),
    [msg, M] = useState("");
  async function submit(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await mutate("put", "settings", {
        ...v,
        contact_email: v.contact_email || null,
      });
      M("Settings saved.");
    } catch (e) {
      M(errText(e));
    }
  }
  return (
    <>
      <SectionHead k="PUBLICATION" title="Site Settings" />
      {r.data ? (
        <form className="form" onSubmit={submit}>
          {[
            ["website_title", "Website title", "Proxima Dining"],
            [
              "website_description",
              "Website description",
              "A global dining guide.",
            ],
            ["footer_text", "Footer text", ""],
            ["contact_email", "Editorial email", ""],
            ["logo_url", "Logo image URL", ""],
            ["instagram_url", "Instagram URL", ""],
            ["facebook_url", "Facebook URL", ""],
          ].map(([k, n, d]) => (
            <label key={k}>
              {n}
              <input
                name={k}
                required={["website_title", "footer_text"].includes(k)}
                defaultValue={r.data[k] || d}
              />
            </label>
          ))}
          <button className="gold">Save settings</button>
          <p role="status">{msg}</p>
        </form>
      ) : (
        <Status r={r} />
      )}
    </>
  );
}
