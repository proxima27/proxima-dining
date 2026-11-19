import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowRight, LockKeyhole, LogOut, ArrowUpRight } from "lucide-react";
import { Brand, SectionHead, Status } from "../../components/Common";
import { api } from "../../services/api";
import { useData } from "../../services/hooks";
import { Manage, Settings } from "./Manage";
import { Editor, Gallery } from "./Editor";
export const names = {
  restaurants: "Restaurants",
  cuisines: "Cuisines",
  categories: "Food categories",
  "menu-items": "Menu items",
  gallery: "Image gallery",
  messages: "Contact messages",
  newsletter: "Subscribers",
  settings: "Site settings",
};
const C = createContext(null);
export const useStaff = () => useContext(C);
export function errText(e) {
  const d = e.response?.data?.detail;
  return typeof d === "string"
    ? d
    : Array.isArray(d)
      ? d.map((i) => i.loc.slice(1).join(" ") + ": " + i.msg).join("; ")
      : "Unable to save changes. Please try again.";
}
export function Staff() {
  const [auth, A] = useState(undefined),
    [msg, M] = useState(""),
    [busy, B] = useState(false);
  const loc = useLocation(),
    nav = useNavigate();
  useEffect(() => {
    api
      .get("/admin/auth/me")
      .then((r) => A(r.data))
      .catch(() => A(null));
    const id = api.interceptors.response.use(
      (v) => v,
      (e) => {
        if (e.response?.status === 401) A(null);
        return Promise.reject(e);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);
  const [inboxTick, setInboxTick] = useState(0);
  const refreshInbox = () => setInboxTick(t => t + 1);
  const inbox = useData(auth ? "/admin/messages/summary" : null, inboxTick).data;
  useEffect(() => {
    if (!auth) return;
    function poll() { if (!document.hidden) refreshInbox(); }
    const timer = window.setInterval(poll, 10000);
    document.addEventListener("visibilitychange", poll);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [auth]);
  async function login(e) {
    e.preventDefault();
    B(true);
    M("");
    try {
      const r = await api.post(
        "/admin/auth/login",
        Object.fromEntries(new FormData(e.currentTarget)),
        { headers: { "X-CSRF-Token": "login" } },
      );
      A(r.data);
      nav("/admin/dashboard");
    } catch (e) {
      M(errText(e));
    } finally {
      B(false);
    }
  }
  if (auth === undefined) return <Status r={{}} />;
  if (!auth && loc.pathname != "/admin")
    return <Navigate to="/admin" replace />;
  if (!auth)
    return (
      <div className="loginbg">
        <div className="logincard">
          <Brand />
          <div className="kicker">
            <span /> PRIVATE EDITORIAL DESK
          </div>
          <h1>Staff sign in</h1>
          <p>Access the Proxima Dining content studio.</p>
          <form className="form" onSubmit={login}>
            <label>
              Username
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="gold" disabled={busy}>
              Sign in <ArrowRight size={16} />
            </button>
            <small role="alert">{msg}</small>
          </form>
          <Link className="textlink" to="/">
            Back to the dining guide
          </Link>
        </div>
      </div>
    );
  const headers = { "X-CSRF-Token": auth.csrf };
  const mutate = (method, url, data) =>
    api.request({ method, url: "/admin/" + url, data, headers });
  return (
    <C.Provider value={{ mutate, inbox, refreshInbox }}>
      <header>
        <div className="wrap navwrap">
          <Brand />
          <span className="stafflabel">EDITORIAL STUDIO</span>
          <Link className="textlink" to="/">
            Public guide <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <div className="cms wrap">
        <aside>
          <div className="kicker">MANAGE</div>
          <NavLink to="/admin/dashboard">Overview</NavLink>
          {Object.entries(names).map(([k, n]) => (
            <NavLink key={k} to={"/admin/" + k}>
              {n}{k === "messages" && inbox?.unread > 0 && <span className="inboxbadge" aria-label={`${inbox.unread} unread`}>{inbox.unread}</span>}
            </NavLink>
          ))}
          <button
            onClick={async () => {
              try {
                await mutate("post", "auth/logout");
                A(null);
                nav("/admin");
              } catch (e) {
                M(errText(e));
              }
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
          <small>{msg}</small>
        </aside>
        <div className="workspace">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            {[
              "restaurants",
              "cuisines",
              "categories",
              "menu-items",
              "messages",
              "newsletter",
            ].map((k) => (
              <React.Fragment key={k}>
                <Route path={k} element={<Manage key={k} kind={k} />} />
                {!["messages", "newsletter"].includes(k) && (
                  <>
                    <Route
                      path={k + "/new"}
                      element={<Editor key={k + "new"} kind={k} />}
                    />
                    <Route
                      path={k + "/:id/edit"}
                      element={<Editor key={k + "edit"} kind={k} />}
                    />
                  </>
                )}
              </React.Fragment>
            ))}
            <Route path="gallery" element={<Gallery />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </div>
      </div>
    </C.Provider>
  );
}
function Dashboard() {
  const { inbox } = useStaff();
  const r = useData("/admin/dashboard");
  return (
    <>
      <SectionHead
        k="THE EDITORIAL DESK"
        title="Studio Overview"
        sub="Your catalogue, at a glance."
      />
      {r.data ? (
        <div className="statgrid">
          {Object.entries(r.data).map(([k, n]) => (
            <Link key={k} to={"/admin/" + k}>
              <small>{names[k]}</small>
              <h2>{k === "messages" ? inbox?.total ?? n : n}</h2>
              <span>
                {k === "messages" && inbox?.unread ? `${inbox.unread} unread · Open inbox` : "Manage"} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Status r={r} />
      )}
    </>
  );
}
