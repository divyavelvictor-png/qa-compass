import { useState } from 'react';
import { Modal, Fld, Inp, Txa, Sel, Btn, ChipInput } from './ui';
import { dbUpdateTC } from '../lib/db';
import { PRIORITIES, TC_TYPES } from '../lib/constants';

export default function EditTCModal({ tc, onClose, onSaved, addToast }) {
  const [f, setF] = useState({
    summary:         tc.summary         || '',
    priority:        tc.priority        || '',
    prerequisite:    tc.prerequisite    || '',
    actions:         tc.actions         || '',
    expectedResults: tc.expectedResults || '',
    actualResults:   tc.actualResults   || '',
    type:            tc.type            || '',
    jiraId:          tc.jiraId          || '',
    component:       tc.component       || '',
    tags:            tc.tags            || [],
    bugDetails:      tc.bugDetails      || '',
  });
  const [saving, setSaving] = useState(false);

  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.summary?.trim()) {
      addToast('Test Summary is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await dbUpdateTC(tc.id, f);
      addToast('Test case updated successfully', 'success');
      onSaved();
      onClose();
    } catch (err) {
      addToast(`Failed to save: ${err?.message || 'please try again'}`, 'error');
    }
    setSaving(false);
  };

  return (
    <Modal
      title={`Edit ${tc.id}`}
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Btn>
          <Btn onClick={save} disabled={saving} className="flex items-center gap-2">
            {saving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin inline-block" /> Saving…</>
              : 'Save'}
          </Btn>
        </>
      }
    >
      <Fld label="Test Case ID">
        <Inp value={tc.id} disabled />
      </Fld>

      <Fld label="Test Summary" req>
        <Inp
          value={f.summary}
          onChange={upd('summary')}
          placeholder="Enter test summary"
        />
      </Fld>

      <Fld label="Priority">
        <Sel opts={PRIORITIES} value={f.priority} onChange={upd('priority')} />
      </Fld>

      <Fld label="Pre-requisite">
        <Txa
          value={f.prerequisite}
          onChange={upd('prerequisite')}
          placeholder="Conditions that must be met before execution"
          rows={3}
        />
      </Fld>

      <Fld label="Actions">
        <Txa
          value={f.actions}
          onChange={upd('actions')}
          placeholder="Step-by-step actions to execute the test"
          rows={5}
        />
      </Fld>

      <Fld label="Expected Results">
        <Txa
          value={f.expectedResults}
          onChange={upd('expectedResults')}
          placeholder="Expected outcome after executing the actions"
          rows={5}
        />
      </Fld>

      <Fld label="Actual Results">
        <Txa
          value={f.actualResults}
          onChange={upd('actualResults')}
          placeholder="Actual outcome observed during execution"
          rows={3}
        />
      </Fld>

      <Fld label="Test Case Type">
        <Sel opts={TC_TYPES} value={f.type} onChange={upd('type')} />
      </Fld>

      <Fld label="JIRA ID">
        <Inp
          value={f.jiraId}
          onChange={upd('jiraId')}
          placeholder="e.g. PROJ-123"
        />
      </Fld>

      <Fld label="Components">
        <Inp
          value={f.component}
          onChange={upd('component')}
          placeholder="e.g. Login, Checkout"
        />
      </Fld>

      <Fld label="Tags">
        <ChipInput
          chips={f.tags}
          onChange={tags => setF(p => ({ ...p, tags }))}
          placeholder="Add tag…"
        />
      </Fld>

      <Fld label="Bug Details">
        <Txa
          value={f.bugDetails}
          onChange={upd('bugDetails')}
          placeholder="e.g. BUG-123 Login fails on mobile"
          rows={2}
        />
      </Fld>
    </Modal>
  );
}
