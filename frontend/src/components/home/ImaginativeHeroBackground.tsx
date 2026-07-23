export function ImaginativeHeroBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-secondary/8 dark:from-primary/12 dark:via-accent/8 dark:to-secondary/12" />

      {/* refined gradient elements - positioned strategically */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl opacity-60" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl opacity-50" />
      <div className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-secondary/15 blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2" />

      {/* subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(currentColor 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
    </div>
  );
}
