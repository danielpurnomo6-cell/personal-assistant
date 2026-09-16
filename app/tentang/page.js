import Link from 'next/link';
import { owner, ownerInitials } from '../lib/owner';

export const metadata = {
  title: 'Tentang — Personal Assistant',
  description: `Profil ${owner.name}`,
};

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Tentang() {
  const hasSkills = owner.skills?.length > 0;
  const hasExperience = owner.experience?.length > 0;
  const hasProjects = owner.projects?.length > 0;
  const hasContacts = owner.contacts?.length > 0;
  const isComplete = owner.title && hasSkills && hasExperience && hasProjects;

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="flex items-center gap-1 px-3 py-2.5">
        <Link
          href="/"
          aria-label="Kembali ke chat"
          title="Kembali ke chat"
          className="rounded-full p-2 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="px-1 text-[15px] font-medium">Tentang</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="mx-auto max-w-2xl space-y-4 pt-4">
          {/* Hero */}
          <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            {owner.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={owner.photo}
                alt={owner.name}
                className="h-20 w-20 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-2xl font-semibold text-white">
                {ownerInitials()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{owner.name}</h1>
              {owner.title ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{owner.title}</p>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Lahir di {owner.birthPlace}, {owner.birthDay} {owner.birthMonth}
                </p>
              )}
              {owner.location && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{owner.location}</p>
              )}
            </div>
          </div>

          <Section title="Bio">
            <p className="text-sm leading-relaxed">{owner.bio}</p>
          </Section>

          {hasSkills && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {owner.skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-neutral-200 px-3 py-1.5 text-xs font-medium dark:bg-neutral-800"
                  >
                    {typeof s === 'string' ? s : `${s.name}${s.level ? ` · ${s.level}` : ''}`}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {hasExperience && (
            <Section title="Pengalaman">
              <ul className="space-y-3">
                {owner.experience.map((e, i) => (
                  <li key={i} className="border-l-2 border-neutral-200 pl-3 text-sm dark:border-neutral-700">
                    <p className="font-medium">
                      {typeof e === 'string' ? e : e.role}
                    </p>
                    {typeof e !== 'string' && (
                      <p className="text-neutral-500 dark:text-neutral-400">
                        {[e.place, e.period].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {hasProjects && (
            <Section title="Proyek">
              <div className="grid gap-2 sm:grid-cols-2">
                {owner.projects.map((p, i) => {
                  const name = typeof p === 'string' ? p : p.name;
                  const desc = typeof p === 'string' ? '' : p.desc;
                  const link = typeof p === 'string' ? '' : p.link;
                  const card = (
                    <>
                      <p className="text-sm font-medium">{name}</p>
                      {desc && (
                        <p className="pt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {desc}
                        </p>
                      )}
                    </>
                  );
                  return link ? (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-neutral-100 p-3 transition hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      {card}
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
                    >
                      {card}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {hasContacts && (
            <Section title="Kontak">
              <div className="flex flex-wrap gap-2">
                {owner.contacts.map((c, i) => {
                  const label = typeof c === 'string' ? c : c.label;
                  const value = typeof c === 'string' ? '' : c.value;
                  const link = typeof c === 'string' ? '' : c.link;
                  const text = value ? `${label}: ${value}` : label;
                  return link ? (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      {text}
                    </a>
                  ) : (
                    <span
                      key={i}
                      className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          {!isComplete && (
            <p className="px-1 text-center text-xs text-neutral-400 dark:text-neutral-500">
              Profil ini akan dilengkapi bertahap.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
