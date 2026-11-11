import { useState } from 'react'
import { Modal, Tabs } from './Modal'
import { tutorialSections, type TutorialSectionId } from './tutorialData'

/** Bảng hướng dẫn 5 thẻ: điều khiển, tiền công, giá cả, thời gian, lộ trình (spec 6.2). */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const sections = tutorialSections()
  const [active, setActive] = useState<TutorialSectionId>('controls')
  const section = sections.find(s => s.id === active)!
  return (
    <Modal title="Hướng dẫn" onClose={onClose} wide>
      <Tabs tabs={sections.map(s => ({ id: s.id, label: s.title }))} active={active} onChange={setActive} />
      <table className="table">
        <tbody>
          {section.rows.map(([k, v]) => (
            <tr key={k}>
              <th>{active === 'controls' ? <kbd>{k}</kbd> : k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary" onClick={onClose}>Đã hiểu</button>
    </Modal>
  )
}
