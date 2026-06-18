export default function PageHeader({ title, subtitle = null, actions = null }) {
  return (
    <header className="admin-ui-page-header">
      <div className="admin-ui-page-header-main">
        <h2>{title}</h2>
        {subtitle ? <p className="admin-ui-page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-ui-page-header-actions">{actions}</div> : null}
    </header>
  )
}
