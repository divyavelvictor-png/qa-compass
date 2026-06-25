import { useState } from 'react';
import { Modal, Fld, Inp, Txa, Sel, Btn, ChipInput } from './ui';
import { BugList } from './BugList';
import { dbCreateTC } from '../lib/db';
import { PRIORITIES, TC_TYPES } from '../lib/constants';

export default function CreateTCModal({ onClose, onCreated, addToast, previewId }) {
  const [f, setF] = useState({
    summary: '', priority: '', prerequisite: '', actions: '',
    expectedResults: '', actualResults: '', type: '',
    jiraId: '', component: '', tags: [], bugDetails: [],
  });

  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.summary?.trim() || !f.priority || !f.type) {
      addToast('Unable to create test case. Please try again', 'error');
      return;
    }
    try {
      const id = await dbCreateTC(f);
      addToast('Test case(s) created successfully', 'success');
      onCreated?.({ id, ...f });
      onClose();
    } catch {
      addToast('Unable to create test case. Please try again', 'error');
    }
  };

  return (
    <Modal
      title="Create Test Case"
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit}>Create</Btn>
        </>
      }
    >
      <Fld label="Test Case ID">
        <Inp value={previewId || 'Auto-generated'} disabled />
      </Fld>
      <Fld label="Test Summary" req>
        <Inp value={f.summary} onChange={upd('summary')} placeholder="Enter test summary" />
      </Fld>
      <Fld label="Priority" req>
        <Sel opts={PRIORITIES} value={f.priority} onChange={upd('priority')} />
      </Fld>
      <Fld label="Pre-requisite">
        <Txa value={f.prerequisite} onChange={upd('prerequisite')} />
      </Fld>
      <Fld label="Actions">
        <Txa value={f.actions} onChange={upd('actions')} />
      </Fld>
      <Fld label="Expected Results">
        <Txa value={f.expectedResults} onChange={upd('expectedResults')} />
      </Fld>
      <Fld label="Test Case Type" req>
        <Sel opts={TC_TYPES} value={f.type} onChange={upd('type')} />
      </Fld>
      <Fld label="JIRA ID">
        <Inp value={f.jiraId} onChange={upd('jiraId')} placeholder="e.g. PROJ-123" />
      </Fld>
      <Fld label="Components">
        <Inp value={f.component} onChange={upd('component')} />
      </Fld>
      <Fld label="Tags">
        <ChipInput chips={f.tags} onChange={tags => setF(p => ({ ...p, tags }))} />
      </Fld>
      <Fld label="Bug Details">
        <BugList bugs={f.bugDetails} onSave={bugs => setF(p => ({ ...p, bugDetails: bugs }))} />
      </Fld>
    </Modal>
  );
}
