import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { SectionHead } from "../components/Common";
import { api } from "../services/api";
function useSubmit(path) {
  const [msg, M] = useState(""),
    [busy, B] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    B(true);
    M("");
    try {
      const r = await api.post(path, Object.fromEntries(new FormData(form)));
      M(r.data.message);
      form.reset();
    } catch (err) {
      M(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Please check the fields and try again.",
      );
    } finally {
      B(false);
    }
  }
  return { submit, busy, msg };
}
export function Newsletter({ unsub = false }) {
  const f = useSubmit("/newsletter/" + (unsub ? "unsubscribe" : "subscribe"));
  return (
    <section className="newsletter">
      <div className="wrap newsinner">
        <div>
          <div className="kicker">
            <span /> LETTERS FROM PROXIMA
          </div>
          <h2>{unsub ? "Leave the mailing list" : "The Dining Letter"}</h2>
          <p>
            {unsub
              ? "Enter the email address you subscribed with."
              : "New discoveries and considered selections, delivered to your inbox."}
          </p>
        </div>
        <div>
          <form className="searchbox" onSubmit={f.submit}>
            <Mail size={17} />
            <input
              name="email"
              type="email"
              placeholder="Your email address"
              aria-label="Email address"
              required
            />
            <button className="gold" disabled={f.busy}>
              {unsub ? "Unsubscribe" : "Subscribe"} <ArrowRight size={15} />
            </button>
          </form>
          <small role="status">
            {f.msg || (
              <Link to={unsub ? "/" : "/unsubscribe"}>
                {unsub ? "Back to discovery" : "Unsubscribe at any time."}
              </Link>
            )}
          </small>
        </div>
      </div>
    </section>
  );
}
export function Contact() {
  const f = useSubmit("/contact");
  return (
    <section className="wrap inner prose">
      <SectionHead
        k="GET IN TOUCH"
        title="Contact the Editors"
        sub="A question about the guide, a correction or a table worth discovering? Write to Proxima."
      />
      <form className="form" onSubmit={f.submit}>
        {[
          ["name", "Name", "text"],
          ["email", "Email address", "email"],
          ["subject", "Subject", "text"],
        ].map(([k, n, t]) => (
          <label key={k}>
            {n}
            <input
              name={k}
              required
              type={t}
              maxLength={k === "name" ? 120 : 160}
            />
          </label>
        ))}
        <label>
          Message
          <textarea name="message" rows="6" maxLength="5000" required />
        </label>
        <input name="company" tabIndex="-1" autoComplete="off" hidden />
        <button className="gold" disabled={f.busy}>
          Send message <ArrowRight size={15} />
        </button>
        <p role="status">{f.msg}</p>
      </form>
    </section>
  );
}
const copy = {
  about: [
    "About Proxima Dining",
    "Dining as discovery",
    "A dining room tells you something about a city before the first plate arrives. Proxima Dining is a guide to those rooms, the people’s culinary traditions they reflect, and the food that brings a table together.",
    "Our editorial approach",
    "Browse by cuisine when a particular flavour calls, or by destination when a new city is on the horizon. Our focus is the experience of discovery: thoughtful descriptions, photographs and menus, without bookings, orders or customer ratings.",
  ],
  privacy: [
    "Privacy Notice",
    "What stays on your device",
    "Your theme, saved favorites and up to eight recently viewed entries are stored in this browser. Clearing site data removes them. You do not need a visitor account.",
    "Information you send",
    "Contact messages and newsletter email addresses are stored in our database for staff to handle. You can unsubscribe using the mailing-list form or contact the editors to request deletion. Private staff sessions use an expiring HTTP-only cookie.",
  ],
  terms: [
    "Terms of Use",
    "Using this guide",
    "Proxima Dining is a restaurant discovery publication, not a booking or ordering service. Development entries are fictional and photographs are illustrative.",
    "Before you visit",
    "For a live restaurant, confirm current prices, opening times, dietary suitability and allergen information directly. Missing allergen data is not an assurance of safety.",
  ],
};
export function Info({ kind }) {
  const c = copy[kind];
  return (
    <section className="wrap inner prose">
      <SectionHead k="PROXIMA DINING" title={c[0]} />
      {kind === "about" && (
        <img
          className="proseimg"
          src="/images/hero.jpg"
          alt="Warmly lit brasserie dining room"
        />
      )}
      <h3>{c[1]}</h3>
      <p>{c[2]}</p>
      <h3>{c[3]}</h3>
      <p>{c[4]}</p>
      <Link className="textlink" to="/contact">
        Contact Proxima <ArrowRight size={15} />
      </Link>
    </section>
  );
}
