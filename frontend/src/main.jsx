import { Staff } from "./pages/admin/Staff";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Library } from "./context/Library";
import { Public } from "./layouts/Public";
import { Home } from "./pages/Home";
import {
  Directory,
  Detail,
  Collections,
  Collection,
  GlobalSearch,
  Favorites,
} from "./pages/Browse";
import { Info, Contact, Newsletter } from "./pages/Info";
import { Empty } from "./components/Common";
import "./styles/app.css";
function App() {
  return (
    <Library>
      <BrowserRouter>
        <Routes>
          <Route path="admin/*" element={<Staff />} />
          <Route element={<Public />}>
            <Route index element={<Home />} />
            <Route path="restaurants" element={<Directory />} />
            <Route path="restaurants/:slug" element={<Detail />} />
            <Route path="food/:slug" element={<Detail food />} />
            {["cuisines", "categories"].map((k) => (
              <React.Fragment key={k}>
                <Route path={k} element={<Collections kind={k} />} />
                <Route path={k + "/:slug"} element={<Collection kind={k} />} />
              </React.Fragment>
            ))}
            <Route path="search" element={<GlobalSearch />} />
            <Route path="favorites" element={<Favorites />} />
            {["about", "terms", "privacy"].map((k) => (
              <Route path={k} key={k} element={<Info kind={k} />} />
            ))}
            <Route path="contact" element={<Contact />} />
            <Route path="unsubscribe" element={<Newsletter unsub />} />
            <Route path="*" element={<Empty title="Page not found" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Library>
  );
}
createRoot(document.getElementById("root")).render(<App />);

// Preserve layout when a publisher's external image disappears.
document.addEventListener(
  "error",
  (event) => {
    const im = event.target;
    if (im instanceof HTMLImageElement && !im.dataset.fallback) {
      im.dataset.fallback = "true";
      im.src = "/images/salon.jpg";
    }
  },
  true,
);
