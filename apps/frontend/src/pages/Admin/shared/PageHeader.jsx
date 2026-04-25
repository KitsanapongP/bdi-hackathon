export default function PageHeader({ title, actions = null }) {
  return (
    <header className="admin-ui-page-header">
      <div className="admin-ui-page-header-main">
        <h2>{title}</h2>
      </div>
      {actions ? <div className="admin-ui-page-header-actions">{actions}</div> : null}
    </header>
  )
}
