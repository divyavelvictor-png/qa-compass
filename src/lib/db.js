import { supabase } from './supabase';

// ── Row mappers (DB snake_case → app camelCase) ──────────
export const tcFromDb = r => ({
  id: r.id, summary: r.summary, priority: r.priority || '',
  prerequisite: r.prerequisite || '', actions: r.actions || '',
  expectedResults: r.expected_results || '', actualResults: r.actual_results || '',
  type: r.type || '', jiraId: r.jira_id || '',
  component: r.component || '', tags: r.tags || [], createdAt: r.created_at,
});

export const tpFromDb = r => ({
  id: r.id, summary: r.summary || '', fixVersions: r.fix_versions || '',
  release: r.release || '', sprint: r.sprint || '',
  labels: r.labels || [], component: r.component || '',
  testCaseIds: r.test_case_ids || [], createdAt: r.created_at,
});

export const exFromDb = r => ({
  tcId: r.tc_id, planId: r.plan_id, status: r.status || '',
  bugId: r.bug_id || '', assignee: r.assignee || '',
  artifacts: r.artifacts || [], createdOn: r.created_on || '',
  executedOn: r.executed_on || '',
});

// ── Test Cases ───────────────────────────────────────────
export async function dbGetTCs() {
  const { data, error } = await supabase.from('test_cases').select('*').order('id');
  if (error) throw error;
  return (data || []).map(tcFromDb);
}

export async function dbCreateTC(form) {
  const { data: val, error: ce } = await supabase.rpc('increment_counter', { counter_name: 'tc' });
  if (ce) throw ce;
  const id = `TC-${String(val).padStart(4, '0')}`;
  const { error } = await supabase.from('test_cases').insert({
    id,
    summary:          form.summary,
    priority:         form.priority        || '',
    prerequisite:     form.prerequisite    || '',
    actions:          form.actions         || '',
    expected_results: form.expectedResults || '',
    actual_results:   form.actualResults   || '',
    type:             form.type            || '',
    jira_id:          form.jiraId          || '',
    component:        form.component       || '',
    tags:             form.tags            || [],
  });
  if (error) throw error;
  return id;
}

export async function dbBulkCreateTCs(rows) {
  const valid = rows.filter(r => (r['Test Summary'] || r['test summary'])?.trim());
  if (!valid.length) return 0;
  const { data: ev, error: ce } = await supabase.rpc('increment_counter_by', {
    counter_name: 'tc',
    increment_by: valid.length,
  });
  if (ce) throw ce;
  const start = ev - valid.length + 1;
  const ins = valid.map((row, i) => ({
    id:               `TC-${String(start + i).padStart(4, '0')}`,
    summary:          String(row['Test Summary']    || row['test summary']    || ''),
    priority:         row['Priority']               || row['priority']               || '',
    prerequisite:     row['Pre-Requisite']          || row['Pre-requisite']          || row['Prerequisite'] || row['prerequisite'] || '',
    actions:          row['Actions']                || row['actions']                || '',
    expected_results: row['Expected Results']       || row['expected results']       || '',
    actual_results:   row['Actual Results']         || row['actual results']         || '',
    type:             row['Test Case Type']         || row['test case type']         || '',
    jira_id:          row['JIRA ID (Optional)'] || row['JIRA ID'] || row['jira id'] || '',
    component:        row['Component']              || row['component']              || '',
    tags:             (row['Tags (Optional)'] || row['Tags'] || row['tags'] || '')
                        .toString().split(',').map(t => t.trim()).filter(Boolean),
  }));
  const { error } = await supabase.from('test_cases').insert(ins);
  if (error) throw error;
  return valid.length;
}

export async function dbUpdateTCTags(id, tags) {
  const { error } = await supabase.from('test_cases').update({ tags }).eq('id', id);
  if (error) throw error;
}

export async function dbUpdateTC(id, form) {
  const { error } = await supabase.from('test_cases').update({
    summary:          form.summary          || '',
    priority:         form.priority         || '',
    prerequisite:     form.prerequisite     || '',
    actions:          form.actions          || '',
    expected_results: form.expectedResults  || '',
    actual_results:   form.actualResults    || '',
    type:             form.type             || '',
    jira_id:          form.jiraId           || '',
    component:        form.component        || '',
    tags:             form.tags             || [],
  }).eq('id', id);
  if (error) throw error;
}

export async function dbDeleteTCs(ids) {
  if (!ids?.length) return;

  // Remove these TC IDs from any test plans that reference them
  const { data: plans } = await supabase.from('test_plans').select('id, test_case_ids');
  const affected = (plans || []).filter(p =>
    (p.test_case_ids || []).some(id => ids.includes(id))
  );
  if (affected.length) {
    await Promise.all(affected.map(p =>
      supabase.from('test_plans')
        .update({ test_case_ids: p.test_case_ids.filter(id => !ids.includes(id)) })
        .eq('id', p.id)
    ));
  }

  // Delete execution records that reference these TCs
  await supabase.from('execution_records').delete().in('tc_id', ids);

  // Delete the test cases themselves
  const { error } = await supabase.from('test_cases').delete().in('id', ids);
  if (error) throw error;
}

// ── Test Plans ───────────────────────────────────────────
export async function dbGetTPs() {
  const { data, error } = await supabase.from('test_plans').select('*').order('id');
  if (error) throw error;
  return (data || []).map(tpFromDb);
}

export async function dbGetNextTPId() {
  try {
    const { data } = await supabase
      .from('counters').select('value').eq('name', 'tp').single();
    const next = (data?.value || 0) + 1;
    return `TP-${String(next).padStart(4, '0')}`;
  } catch {
    return 'Auto-generated';
  }
}

export async function dbCreateTP(form) {
  const { data: val, error: ce } = await supabase.rpc('increment_counter', { counter_name: 'tp' });
  if (ce) throw ce;
  const id = `TP-${String(val).padStart(4, '0')}`;
  const { error } = await supabase.from('test_plans').insert({
    id,
    summary:       form.summary      || '',
    fix_versions:  form.fixVersions  || '',
    release:       form.release      || '',
    sprint:        form.sprint,
    labels:        form.labels       || [],
    component:     form.component    || '',
    test_case_ids: [],
  });
  if (error) throw error;
  return id;
}

export async function dbUpdateTPIds(planId, ids) {
  const { error } = await supabase
    .from('test_plans')
    .update({ test_case_ids: ids })
    .eq('id', planId);
  if (error) throw error;
}

export async function dbDeleteTPs(ids) {
  if (!ids?.length) return;

  // Delete all execution records for these plans
  await supabase.from('execution_records').delete().in('plan_id', ids);

  // Delete the test plans themselves
  const { error } = await supabase.from('test_plans').delete().in('id', ids);
  if (error) throw error;
}

// ── Execution Records ────────────────────────────────────
export async function dbGetExecForPlan(planId) {
  const { data, error } = await supabase
    .from('execution_records')
    .select('*')
    .eq('plan_id', planId);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.tc_id] = exFromDb(r); });
  return map;
}

export async function dbGetAllExec() {
  const { data, error } = await supabase.from('execution_records').select('*');
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[`${r.plan_id}:${r.tc_id}`] = exFromDb(r); });
  return map;
}

// Returns per-plan execution stats keyed by plan_id
export async function dbGetAllExecGrouped() {
  const { data, error } = await supabase.from('execution_records').select('*');
  if (error) throw error;
  const grouped = {};
  (data || []).forEach(r => {
    if (!grouped[r.plan_id]) grouped[r.plan_id] = { tcIds: new Set(), total: 0, pass: 0, fail: 0, rerunPass: 0, rerunFail: 0, lastExecuted: null };
    const g = grouped[r.plan_id];
    g.tcIds.add(r.tc_id);
    if (r.status) {
      g.total++;
      if (r.status === 'Pass')         g.pass++;
      else if (r.status === 'Fail')    g.fail++;
      else if (r.status === 'Rerun - Pass') g.rerunPass++;
      else if (r.status === 'Rerun - Fail') g.rerunFail++;
    }
    if (r.executed_on && (!g.lastExecuted || r.executed_on > g.lastExecuted))
      g.lastExecuted = r.executed_on;
  });
  // Convert Set → count
  Object.values(grouped).forEach(g => { g.tcCount = g.tcIds.size; delete g.tcIds; });
  return grouped;
}

export async function dbUpsertExec(planId, tcId, rec) {
  const { error } = await supabase.from('execution_records').upsert(
    {
      plan_id:     planId,
      tc_id:       tcId,
      status:      rec.status      || null,
      bug_id:      rec.bugId       || '',
      assignee:    rec.assignee    || '',
      artifacts:   rec.artifacts   || [],
      created_on:  rec.createdOn   || new Date().toISOString().split('T')[0],
      executed_on: rec.executedOn  || null,
    },
    { onConflict: 'plan_id,tc_id' }
  );
  if (error) throw error;
}
