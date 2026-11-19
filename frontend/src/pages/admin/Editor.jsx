import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "../../services/hooks";
import { useStaff, names, errText } from "./Staff";
import { SectionHead, Status } from "../../components/Common";
function ImageField({ value = "", onChange }) {
  const { mutate } = useStaff(),
    [msg, M] = useState("");
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    M("Uploading…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await mutate("post", "gallery/upload", fd);
      onChange(r.data.image_url);
      M("Uploaded. Save this record to attach the image.");
    } catch (e) {
      M(errText(e));
    }
  }
  return (
    <div className="imagefield">
      <label>
        Image URL
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /images/…"
        />
      </label>
      <label>
        Or upload an image (5 MB maximum)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={upload}
        />
      </label>
      <small role="status">{msg}</small>
    </div>
  );
}
const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const common = ["name", "slug", "description", "image_url"];
const specific = {
  restaurants: [
    "city",
    "country",
    "country_code",
    "price_category",
    "cuisine_ids",
    "address",
    "website_url",
    "contact_email",
    "phone",
    "logo_url",
    "instagram_url",
    "facebook_url",
    "latitude",
    "longitude",
    "timezone",
    "hours",
    "is_featured",
    "is_published",
  ],
  categories: ["display_order"],
  cuisines: [],
  "menu-items": [
    "restaurant_id",
    "category_id",
    "price",
    "currency",
    "ingredients",
    "tags",
    "allergen_information",
    "is_featured",
    "is_published",
  ],
};
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export function Editor({ kind }) {
  const { id } = useParams(),
    nav = useNavigate(),
    r = useData(id ? "/admin/" + kind + "/" + id : null),
    { mutate } = useStaff();
  const [v, V] = useState({
      price_category: "$$",
      cuisine_ids: [],
      hours: [],
      tags: [],
    }),
    [msg, M] = useState(""),
    [busy, B] = useState(false);
  const cu = useData(kind === "restaurants" ? "/admin/cuisines" : null),
    rs = useData(kind === "menu-items" ? "/admin/restaurants" : null),
    cs = useData(kind === "menu-items" ? "/admin/categories" : null);
  useEffect(() => {
    if (r.data) V(r.data);
  }, [r.data]);
  const set = (k, val) => V((o) => ({ ...o, [k]: val }));
  const field = (
    k,
    label,
    { required = false, type = "text", opts = null, area = false } = {},
  ) => (
    <label key={k}>
      {label}
      {opts ? (
        <select
          required={required}
          value={v[k] ?? ""}
          onChange={(e) => set(k, e.target.value)}
        >
          <option value="">Select…</option>
          {opts.map(([val, n]) => (
            <option value={val} key={val}>
              {n}
            </option>
          ))}
        </select>
      ) : area ? (
        <textarea
          rows="3"
          value={v[k] || ""}
          onChange={(e) => set(k, e.target.value)}
        />
      ) : (
        <input
          required={required}
          type={type}
          step={type === "number" ? "any" : undefined}
          value={v[k] ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (
              k === "name" &&
              !id &&
              (!v.slug || v.slug === slug(v.name || ""))
            )
              V((o) => ({ ...o, name: val, slug: slug(val) }));
            else set(k, val);
          }}
        />
      )}
    </label>
  );
  async function submit(e) {
    e.preventDefault();
    B(true);
    M("");
    try {
      const payload = {};
      for (const k of [...common, ...specific[kind]])
        if (v[k] !== undefined && v[k] !== null && v[k] !== "")
          payload[k] = v[k];
      if (payload.hours)
        payload.hours = payload.hours.map((h) => ({
          day_of_week: h.day_of_week,
          opens_at: h.is_closed ? null : h.opens_at,
          closes_at: h.is_closed ? null : h.closes_at,
          is_closed: !!h.is_closed,
        }));
      await mutate(id ? "put" : "post", kind + (id ? "/" + id : ""), payload);
      nav("/admin/" + kind);
    } catch (e) {
      M(errText(e));
    } finally {
      B(false);
    }
  }
  if (id && !r.data) return <Status r={r} />;
  return (
    <>
      <Link className="textlink" to={"/admin/" + kind}>
        ← {names[kind]}
      </Link>
      <SectionHead
        k="EDITORIAL RECORD"
        title={
          (id ? "Edit " : "New ") +
          {
            restaurants: "Restaurant",
            cuisines: "Cuisine",
            categories: "Category",
            "menu-items": "Menu Item",
          }[kind]
        }
      />
      <form className="form" onSubmit={submit}>
        {field("name", "Name", { required: true })}
        {field("slug", "URL slug", { required: true })}
        {field("description", "Description", { area: true })}
        <ImageField value={v.image_url} onChange={(s) => set("image_url", s)} />
        {kind === "restaurants" && (
          <>
            {field("city", "City", { required: true })}
            {field("country", "Country", { required: true })}
            {field("country_code", "ISO country code")}
            {field("price_category", "Price category", {
              opts: ["$", "$$", "$$$", "$$$$"].map((s) => [s, s]),
            })}
            <fieldset>
              <legend>Cuisines</legend>
              <div className="checkgroup">
                {cu.data?.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={v.cuisine_ids?.includes(c.id) || false}
                      onChange={(e) =>
                        set(
                          "cuisine_ids",
                          e.target.checked
                            ? [...(v.cuisine_ids || []), c.id]
                            : v.cuisine_ids.filter((i) => i !== c.id),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {[
              "address",
              "phone",
              "contact_email",
              "website_url",
              "instagram_url",
              "facebook_url",
              "logo_url",
              "latitude",
              "longitude",
              "timezone",
            ].map((k) => field(k, k.replaceAll("_", " ")))}
            <fieldset>
              <legend>Opening hours · local time</legend>
              {v.hours?.map((h, i) => {
                const change = (o) =>
                  set(
                    "hours",
                    v.hours.map((z, j) => (j === i ? { ...z, ...o } : z)),
                  );
                return (
                  <div className="hoursrow" key={i}>
                    <select
                      aria-label="Day"
                      value={h.day_of_week}
                      onChange={(e) => change({ day_of_week: +e.target.value })}
                    >
                      {days.map((d, j) => (
                        <option key={d} value={j}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!h.is_closed}
                        onChange={(e) =>
                          change({ is_closed: e.target.checked })
                        }
                      />
                      Closed
                    </label>
                    {!h.is_closed &&
                      ["opens_at", "closes_at"].map((k) => (
                        <input
                          key={k}
                          aria-label={k}
                          required
                          type="time"
                          value={h[k] || ""}
                          onChange={(e) => change({ [k]: e.target.value })}
                        />
                      ))}
                    <button
                      type="button"
                      aria-label="Remove period"
                      onClick={() =>
                        set(
                          "hours",
                          v.hours.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="btn"
                onClick={() =>
                  set("hours", [
                    ...(v.hours || []),
                    { day_of_week: 0, is_closed: false },
                  ])
                }
              >
                Add opening period
              </button>
            </fieldset>
          </>
        )}
        {kind === "categories" &&
          field("display_order", "Display order", { type: "number" })}
        {kind === "menu-items" && (
          <>
            {field("restaurant_id", "Restaurant", {
              required: true,
              opts: (rs.data || []).map((x) => [x.id, x.name]),
            })}
            {field("category_id", "Category", {
              required: true,
              opts: (cs.data || []).map((x) => [x.id, x.name]),
            })}
            {field("price", "Price", { type: "number" })}
            {field("currency", "ISO currency code")}
            {field("ingredients", "Ingredients", { area: true })}
            <label>
              Dietary labels (comma-separated)
              <input
                value={(v.tags || []).join(",")}
                onChange={(e) =>
                  set("tags", e.target.value ? e.target.value.split(",") : [])
                }
              />
            </label>
            {field("allergen_information", "Verified allergen information", {
              area: true,
            })}
          </>
        )}
        {["restaurants", "menu-items"].includes(kind) && (
          <div className="checkgroup">
            {["is_featured", "is_published"].map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={v[k] || false}
                  onChange={(e) => set(k, e.target.checked)}
                />
                {k === "is_featured" ? "Featured" : "Published"}
              </label>
            ))}
          </div>
        )}
        <button disabled={busy} className="gold">
          {busy ? "Saving…" : "Save record"}
        </button>
        <p role="alert">{msg}</p>
      </form>
    </>
  );
}
export function Gallery() {
  const [rev, R] = useState(0),
    g = useData("/admin/gallery", rev),
    rs = useData("/admin/restaurants"),
    it = useData("/admin/menu-items");
  const [v, V] = useState({}),
    [msg, M] = useState(""),
    { mutate } = useStaff();
  const set = (k, a) => V((o) => ({ ...o, [k]: a }));
  const food = !!v.menu_item_id || v.kind === "dish";
  async function submit(e) {
    e.preventDefault();
    try {
      await mutate(
        v.id ? "put" : "post",
        "gallery" + (v.id ? "/" + v.kind + "/" + v.id : ""),
        {
          [food ? "menu_item_id" : "restaurant_id"]: Number(
            food ? v.menu_item_id : v.restaurant_id,
          ),
          image_url: v.image_url || "",
          caption: v.caption || "",
          display_order: +(v.display_order || 0),
        },
      );
      V({});
      R(rev + 1);
      M("Gallery updated.");
    } catch (e) {
      M(errText(e));
    }
  }
  return (
    <>
      <SectionHead k="MEDIA LIBRARY" title="Image Gallery" />
      <form className="form" onSubmit={submit}>
        <label>
          Owner type
          <select
            disabled={!!v.id}
            value={food ? "dish" : "restaurant"}
            onChange={(e) => V({ kind: e.target.value })}
          >
            <option value="restaurant">Restaurant</option>
            <option value="dish">Menu item</option>
          </select>
        </label>
        <label>
          Associated record
          <select
            required
            value={(food ? v.menu_item_id : v.restaurant_id) || ""}
            onChange={(e) =>
              set(food ? "menu_item_id" : "restaurant_id", e.target.value)
            }
          >
            <option value="">Select a record</option>
            {(food ? it : rs).data?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <ImageField value={v.image_url} onChange={(a) => set("image_url", a)} />
        <label>
          Caption
          <input
            value={v.caption || ""}
            onChange={(e) => set("caption", e.target.value)}
          />
        </label>
        <label>
          Display order
          <input
            type="number"
            min="0"
            value={v.display_order || 0}
            onChange={(e) => set("display_order", e.target.value)}
          />
        </label>
        <button className="gold">{v.id ? "Save image" : "Attach image"}</button>
        {v.id && (
          <button type="button" className="btn" onClick={() => V({})}>
            Cancel edit
          </button>
        )}
        <p role="status">{msg}</p>
      </form>
      {g.data ? (
        <div className="recordlist">
          {g.data.map((x) => (
            <div key={x.kind + x.id}>
              <img src={x.image_url} alt={x.caption || "Gallery image"} />
              <span className="recordtext">
                {x.caption || "Untitled image"}
                <small>
                  {x.kind} · position {x.display_order}
                </small>
              </span>
              <button
                className="btn"
                onClick={() => {
                  V(x);
                  window.scrollTo(0, 0);
                }}
              >
                Edit
              </button>
              <button
                className="btn"
                onClick={async () => {
                  if (confirm("Remove this gallery image?"))
                    try {
                      await mutate("delete", "gallery/" + x.kind + "/" + x.id);
                      R(rev + 1);
                    } catch (e) {
                      M(errText(e));
                    }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Status r={g} />
      )}
    </>
  );
}
