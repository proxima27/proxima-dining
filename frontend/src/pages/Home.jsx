import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe2,
  MapPin,
  Compass,
  Pizza,
  Fish,
  Wheat,
  Flame,
  Utensils,
  Croissant,
  Leaf,
  Beef,
} from "lucide-react";
import { useData } from "../services/hooks";
import { Grid, SearchBox, SectionHead, Status } from "../components/Common";
import { Newsletter } from "./Info";
const icons = {
  Italian: Pizza,
  Japanese: Fish,
  Nigerian: Flame,
  French: Croissant,
  Mexican: Wheat,
  Indian: Leaf,
  American: Beef,
  Mediterranean: Utensils,
};
export function Home() {
  const feat = useData("/restaurants/featured"),
    cs = useData("/cuisines"),
    ds = useData("/menu-items?featured=true&sort=newest&size=3"),
    latest = useData("/restaurants?sort=newest&size=3"),
    dest = useData("/restaurants/destinations");
  const [slide, S] = useState(0);
  const featured = feat.data?.slice(0, 3) || [],
    f = featured[slide % Math.max(1, featured.length)];
  return (
    <>
      <section
        className="hero"
        style={{
          backgroundImage: `url(${f?.spotlight_image || f?.image_url || "/images/hero.jpg"})`,
        }}
      >
        <div className="wrap heroInner">
          <div className="heroCopy">
            <div className="kicker">
              <span /> THE GLOBAL DINING GUIDE
            </div>
            <h1>
              Discover
              <br />
              <em>Extraordinary</em> Dining.
            </h1>
            <p>
              A curated guide to remarkable restaurants, distinctive cuisines,
              <br className="wide" /> and the stories behind every table.
            </p>
            <SearchBox home />
          </div>
          {f && (
            <div className="heroBottom">
              <div className="caption">
                <span className="glint">✧</span>
                <div>
                  <small>IN THE SPOTLIGHT</small>
                  <Link to={"/restaurants/" + f.slug}>
                    {f.name}{" "}
                    <span>
                      — {f.city}, {f.country}
                    </span>{" "}
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
              <div className="slides">
                <button
                  aria-label="Previous spotlight"
                  onClick={() =>
                    S((slide + featured.length - 1) % featured.length)
                  }
                >
                  <ChevronLeft />
                </button>
                <span>
                  {String(slide + 1).padStart(2, "0")} <b>/</b>{" "}
                  {String(featured.length).padStart(2, "0")}
                </span>
                <button
                  aria-label="Next spotlight"
                  onClick={() => S((slide + 1) % featured.length)}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="cuisinebar">
        <div className="wrap cuinner">
          <span className="eyetag">
            <Globe2 size={17} /> EXPLORE CUISINES
          </span>
          <div className="chips">
            {[
              "Italian",
              "Japanese",
              "French",
              "Nigerian",
              "Mexican",
              "Indian",
            ].map((n) => {
              const c = cs.data?.find((x) => x.name === n),
                Icon = icons[n];
              return (
                c && (
                  <Link to={"/cuisines/" + c.slug} key={n}>
                    <Icon size={15} />
                    {n}
                  </Link>
                )
              );
            })}
          </div>
          <Link className="allcuisine" to="/cuisines">
            View all <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="wrap section">
        <SectionHead
          k="THE PROXIMA EDIT"
          title="Featured Restaurants"
          sub="Distinctive tables, handpicked for your next discovery."
          link="All restaurants"
          to="/restaurants"
        />
        {feat.data ? <Grid items={featured} /> : <Status r={feat} />}
      </section>
      <section className="alt">
        <div className="wrap section">
          <SectionHead
            k="ON THE MENU"
            title="Dishes to Discover"
            sub="A closer look at what’s on the table."
            link="Explore categories"
            to="/categories"
          />
          {ds.data ? <Grid items={ds.data.items} /> : <Status r={ds} />}
        </div>
      </section>
      <section className="wrap section">
        <SectionHead k="FRESH IN THE DIRECTORY" title="New to the Guide" sub="Meet the latest additions to our dining collection." link="All new additions" to="/restaurants?sort=newest" />
        {latest.data ? <Grid items={latest.data.items} /> : <Status r={latest}/>}
      </section>
      {feat.data?.[3] && (
        <section className="wrap section editorial">
          <img
            src={feat.data[3].image_url}
            loading="lazy"
            alt={feat.data[3].name}
          />
          <div>
            <div className="kicker">
              <span /> EDITOR’S SELECTION
            </div>
            <h2>{feat.data[3].name}</h2>
            <p>{feat.data[3].description}</p>
            <Link className="textlink" to={"/restaurants/" + feat.data[3].slug}>
              Inside the restaurant <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}
      <section className="wrap section">
        <SectionHead k="THE DESTINATION INDEX" title="A World of Dining" />
        <div className="destgrid">
          {dest.data?.map((x) => (
            <Link
              key={x.city}
              to={"/restaurants?city=" + encodeURIComponent(x.city)}
            >
              <MapPin size={16} />
              <div>
                {x.city}
                <small>{x.country}</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <Newsletter />
    </>
  );
}
