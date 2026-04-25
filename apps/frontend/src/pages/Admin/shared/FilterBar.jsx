export default function FilterBar({ label, children, right = null }) {
  return (
    <section className="admin-ui-filter-bar">
      <div className="admin-ui-filter-bar-main">
        {label ? <strong>{label}</strong> : null}
        {children}
      </div>
      {right ? <div className="admin-ui-filter-bar-right">{right}</div> : null}
    </section>
  )
}
