import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/site/contact-form";
import { EventRow } from "@/components/site/event-row";
import { FaqList } from "@/components/site/faq";
import { Gallery } from "@/components/site/gallery";
import { HeroCanvas } from "@/components/site/hero-canvas";
import { Markdown } from "@/components/site/markdown";
import { Plans } from "@/components/site/plans";
import { Testimonials } from "@/components/site/testimonials";
import {
  getFaq,
  getGames,
  getPhotos,
  getPlans,
  getSettings,
  getStats,
  getTestimonials,
  getUpcomingEvents,
} from "@/server/queries/public";

export const revalidate = 3600;

export default async function HomePage() {
  const [settings, games, events, stats, testimonials, photos, plans, faq] = await Promise.all([
    getSettings(),
    getGames(),
    getUpcomingEvents({ limit: 4 }),
    getStats(),
    getTestimonials(),
    getPhotos(8),
    getPlans(),
    getFaq(),
  ]);
  const marquee = [...games.map((g) => g.name), "Débutants bienvenus", "Amiens"];
  const { address, hours, socials } = settings;

  return (
    <main id="accueil">
      {/* HERO */}
      <section className="hero" id="hero" aria-label="Accueil">
        <HeroCanvas />
        <div className="wrap">
          <div className="hero-logo-wrap">
            <Image
              className="hero-logo"
              src="/logo.png"
              alt="Logo de L'Ordre du Nautilus : trois tentacules dans un cercle"
              width={360}
              height={360}
              priority
              data-logo=""
            />
          </div>
          <h1>
            {["Plongez", "dans", "le", "jeu."].map((w, i) => (
              <span key={w}>
                <span className="w">
                  <span>{w}</span>
                </span>
                {i < 3 ? " " : null}
              </span>
            ))}
          </h1>
          <p className="lead reveal-hero">
            Association de jeux de cartes à collectionner à Amiens. Magic, Pokémon, Lorcana, One
            Piece et d&apos;autres, chaque semaine, à tous les niveaux.
          </p>
          <div className="hero-actions reveal-hero">
            <Link className="btn btn-primary magnetic" href="/evenements?type=decouverte">
              Venir à une soirée découverte{" "}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link className="btn btn-ghost magnetic" href="/adherer">
              Adhérer
            </Link>
          </div>
        </div>
        <div className="scroll-hint" aria-hidden="true">
          <i />
          Descendre
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track" id="marquee">
          {[...marquee, ...marquee].map((n, i) => (
            <span key={`${n}-${i}`}>{n}</span>
          ))}
        </div>
      </div>

      {/* L'ORDRE */}
      <section id="ordre">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="kicker">L&apos;Ordre</p>
            <h2>Un équipage, plusieurs jeux, une seule table.</h2>
            <p>
              Fondée par des joueurs amiénois, l&apos;association réunit débutants et compétiteurs
              autour des jeux de cartes à collectionner. On vient pour jouer, on reste pour les
              gens.
            </p>
          </div>
          <div className="pillars">
            <article className="pillar reveal">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <rect x="10" y="6" width="22" height="32" rx="2" transform="rotate(-8 21 22)" />
                <rect x="18" y="10" width="22" height="32" rx="2" transform="rotate(6 29 26)" />
                <circle cx="29" cy="26" r="5" />
              </svg>
              <h3>Jouer</h3>
              <p>
                Trois soirées par semaine, des tables ouvertes en format libre et des tournois
                mensuels avec dotation. Vous amenez votre deck, ou vous empruntez l&apos;un des
                nôtres.
              </p>
            </article>
            <article className="pillar reveal">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M6 12c6-4 12-4 18 0 6-4 12-4 18 0v26c-6-4-12-4-18 0-6-4-12-4-18 0z" />
                <path d="M24 12v26" />
                <path d="M12 20c3-1 6-1 8 0M12 26c3-1 6-1 8 0M28 20c3-1 6-1 8 0M28 26c3-1 6-1 8 0" />
              </svg>
              <h3>Apprendre</h3>
              <p>
                Chaque soirée découverte commence par une partie guidée. Règles, construction de
                deck, lecture d&apos;une méta : les membres expérimentés prennent le temps.
              </p>
            </article>
            <article className="pillar reveal">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="16" cy="18" r="6" />
                <circle cx="32" cy="18" r="6" />
                <path d="M4 40c0-8 5-13 12-13 3 0 5 1 8 3 3-2 5-3 8-3 7 0 12 5 12 13" />
              </svg>
              <h3>Se rencontrer</h3>
              <p>
                Un local à Amiens, un serveur Discord actif, des sorties en tournoi régional et un
                week-end annuel. Le jeu est le prétexte ; le reste vient tout seul.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* JEUX */}
      <section id="jeux" className="games">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="kicker">Les jeux</p>
            <h2>Ce qu&apos;on joue, et quand.</h2>
            <p>
              Chaque jeu a son soir et ses référents. Si le vôtre n&apos;est pas dans la liste,
              proposez-le : plusieurs tables sont nées comme ça.
            </p>
          </div>
          <div className="games-grid" id="games">
            {games.map((g) => (
              <article
                key={g.id}
                className="game reveal"
                style={{ ["--tint" as string]: g.accentColor }}
              >
                <div className="deep" />
                <div className="glare" />
                <div className="sigil" aria-hidden="true">
                  {g.sigil}
                </div>
                <h3>{g.name}</h3>
                <div className="meta">
                  <span>
                    <em>{g.usualDay}</em>
                  </span>
                  <span>{g.levels}</span>
                  <span>{g.formats.join(", ")}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SOIRÉES */}
      <section id="soirees" className="events">
        <div className="wrap">
          <div className="events-head section-head reveal" style={{ maxWidth: "none" }}>
            <div>
              <p className="kicker">Prochaines soirées</p>
              <h2>À l&apos;agenda</h2>
            </div>
            <Link className="btn btn-ghost btn-small" href="/evenements">
              Voir tout l&apos;agenda
            </Link>
          </div>
          <div className="event-list reveal" id="eventlist">
            {events.length ? (
              events.map((e) => <EventRow key={e.id} event={e} />)
            ) : (
              <div className="empty">
                Aucune soirée programmée pour l&apos;instant. Les prochaines dates arrivent en début
                de mois — rejoignez le Discord pour être prévenu.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CHIFFRES */}
      <section className="stats" aria-label="Chiffres clés">
        <div className="wrap">
          {stats.map((s) => (
            <div className="stat reveal" key={s.label}>
              <b data-count={s.value}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* JULES VERNE */}
      <section className="verne" id="verne">
        <div className="wrap">
          <div className="porthole reveal" data-parallax="0.12">
            <div className="img" data-parallax-inner="" />
            <span className="rivet" style={{ top: "4%", left: "50%" }} />
            <span className="rivet" style={{ top: "50%", left: "3%" }} />
            <span className="rivet" style={{ top: "50%", right: "3%" }} />
            <span className="rivet" style={{ bottom: "4%", left: "50%" }} />
            <div className="cap">[Photo : Maison de Jules Verne, Amiens]</div>
          </div>
          <div className="reveal">
            <p className="kicker">Amiens</p>
            <blockquote>Mobilis in mobili.</blockquote>
            <cite>Devise du Nautilus — Jules Verne, Vingt mille lieues sous les mers</cite>
            <p>
              Jules Verne a écrit la plupart de ses romans à Amiens, dans la maison à la tour de la
              rue Charles-Dubois, et repose au cimetière de la Madeleine. Le Nautilus, c&apos;était
              la promesse d&apos;un monde caché sous la surface. On a trouvé que ça ressemblait pas
              mal à ce qui se passe autour d&apos;une table de jeu.
            </p>
            <p style={{ marginTop: "1rem" }}>
              Le local est à quelques minutes de la maison. Les soirs de match, on entend encore les
              cloches de la cathédrale.
            </p>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      {testimonials.length > 0 ? (
        <section className="quotes" aria-label="Témoignages">
          <div className="wrap">
            <Testimonials items={testimonials} />
          </div>
        </section>
      ) : null}

      {/* GALERIE */}
      <section className="gallery" id="galerie">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="kicker">Galerie</p>
            <h2>Les soirs de tables pleines.</h2>
          </div>
          <Gallery photos={photos} />
          {photos.length >= 8 ? (
            <p className="gallery-more reveal">
              <Link className="btn btn-ghost btn-small" href="/galerie">
                Toutes les photos
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* ADHÉSION */}
      <section className="join" id="adhesion">
        <div className="wrap">
          <div
            className="section-head reveal"
            style={{ textAlign: "center", marginInline: "auto", justifyItems: "center" }}
          >
            <p className="kicker">Adhésion</p>
            <h2>Rejoindre l&apos;équipage</h2>
            <p>
              L&apos;adhésion finance le local, le matériel de jeu prêté aux nouveaux et les
              dotations des tournois. La première soirée est toujours gratuite.
            </p>
          </div>
          <Plans plans={plans} />
          <p className="join-note">
            Paiement par PayPal, carte de membre remise en main propre. {settings.membershipNote}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="kicker">Questions fréquentes</p>
            <h2>Avant de descendre à bord</h2>
            <p>Il en manque une ? Écrivez-nous, on répond vite.</p>
          </div>
          <FaqList
            items={faq.map((f) => ({
              id: f.id,
              question: f.question,
              answer: <Markdown>{f.answer}</Markdown>,
            }))}
          />
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact" id="contact">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">Contact</p>
            <h2>Le local</h2>
            <address>
              <div>
                <strong>Adresse</strong>
                {address.venue}
                <br />
                {address.street}, {address.postalCode} {address.city}
              </div>
              <div>
                <strong>Horaires</strong>
                {hours.map((h, i) => (
                  <span key={h.label}>
                    {h.label} {h.value}
                    {i < hours.length - 1 ? <br /> : null}
                  </span>
                ))}
              </div>
              <div>
                <strong>Écrire</strong>
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              </div>
            </address>
            <div className="socials">
              {socials.discord ? (
                <a
                  href={socials.discord}
                  aria-label="Discord"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.5 17.5c-2.5 0-4.5-1-4.5-1 .5-4 1.8-8 3.5-10.5 1.5-.7 3-1 3-1l.5 1.5c1-.2 2-.2 3 0L14.5 5s1.5.3 3 1c1.7 2.5 3 6.5 3.5 10.5 0 0-2 1-4.5 1l-1-1.5c-1.5.5-3 .5-4.5 0z" />
                    <circle cx="9.5" cy="12" r="1.2" />
                    <circle cx="14.5" cy="12" r="1.2" />
                  </svg>
                </a>
              ) : null}
              {socials.instagram ? (
                <a
                  href={socials.instagram}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17" cy="7" r=".8" fill="currentColor" />
                  </svg>
                </a>
              ) : null}
              {socials.facebook ? (
                <a
                  href={socials.facebook}
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 8h2.5V4.5H14c-2.5 0-4 1.5-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V9c0-.6.4-1 .5-1z" />
                  </svg>
                </a>
              ) : null}
            </div>
            <div className="map" aria-hidden={address.mapUrl ? undefined : true}>
              <span className="pin" />
              <small>{address.mapUrl ? "Ouvrir le plan" : "[Carte interactive à intégrer]"}</small>
              {address.mapUrl ? (
                <a
                  href={address.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Voir le local sur un plan"
                />
              ) : null}
            </div>
          </div>
          <div className="reveal">
            <ContactForm games={games.map((g) => g.name)} />
          </div>
        </div>
      </section>
    </main>
  );
}
