export default function SectionHeading({ title, description, right = null }) {
  return (
    <header className="admin-ui-section-head">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {right}
    </header>
  )
}
