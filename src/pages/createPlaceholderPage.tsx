import { PageHeader } from '@components/ui'

type PlaceholderPageConfig = {
  title: string
  subtitle?: string
  moduleName: string
}

export function createPlaceholderPage({ title, subtitle, moduleName }: PlaceholderPageConfig) {
  function PlaceholderPage() {
    return (
      <div className="space-y-6">
        <PageHeader title={title} subtitle={subtitle} />
        <section className="panel placeholder-card">
          <p className="eyebrow">Scaffold Ready</p>
          <h2>Module: {moduleName} — Coming Soon</h2>
          <p>
            The environment, routing, layout shell, and design system are ready for this module.
            Business workflows and domain-specific screens will be implemented on top of this
            foundation next.
          </p>
        </section>
      </div>
    )
  }

  return PlaceholderPage
}
