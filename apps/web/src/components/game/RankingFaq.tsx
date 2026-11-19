/** Player-facing Classical ranking rules (plan FAQ draft). */
const SECTIONS = [
  {
    heading: "How rating works",
    body: "We use Elo. New accounts start at 1200 in the Classical pool. Win, draw, or loss moves your rating up or down based on the opponent’s rating. Rating can’t go below 100.",
  },
  {
    heading: "Leaderboard",
    body: "You appear on the public Classical board after 5 ranked games. If you play no ranked games for 365 days, you’re hidden until you play one again — points stay.",
  },
  {
    heading: "Titles (Classical only)",
    body: "Permanent once earned: N (<1300), 3 (1300+), 2 (1500+), 1 (1700+), C (1900+), M (2100+), H (2300+), G (2500+). Dropping rating does not remove a title.",
  },
  {
    heading: "Fair play",
    body: "Playing the same opponent many times in a day earns less (or no) rating after the 3rd ranked game vs them in 24 hours. Find-match games are ranked; private rooms are unranked in v1.",
  },
] as const;

export function RankingFaq({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <li key={section.heading} className="space-y-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
