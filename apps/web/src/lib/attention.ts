const EN: Record<string, string> = {
  FEED_NOT_LOGGED_TODAY: 'Feed has not been logged today',
  GROWTH_SAMPLE_OVERDUE: 'Growth sample is overdue',
  HEALTH_EVENT_REVIEW: 'Recent health event needs review',
  WATER_READING_MISSING: 'No recent water reading',
  WATER_OUT_OF_RANGE: 'Water reading is outside the safe range',
};

const TE: Record<string, string> = {
  FEED_NOT_LOGGED_TODAY: 'ఈరోజు ఆహారం నమోదు కాలేదు',
  GROWTH_SAMPLE_OVERDUE: 'వృద్ధి నమూనా ఆలస్యమైంది',
  HEALTH_EVENT_REVIEW: 'ఇటీవలి ఆరోగ్య ఘటనను పరిశీలించాలి',
  WATER_READING_MISSING: 'ఇటీవలి నీటి రీడింగ్ లేదు',
  WATER_OUT_OF_RANGE: 'నీటి రీడింగ్ సురక్షిత పరిమితి బయట ఉంది',
};

export function attentionLabel(reason: string | undefined, signals: string[] | undefined, language: 'en' | 'te'): string {
  const dictionary = language === 'te' ? TE : EN;
  const values = (signals?.length ? signals : reason?.split(',').map((value) => value.trim()) ?? [])
    .map((value) => dictionary[value] ?? value)
    .filter(Boolean);
  return values.length ? values.join(language === 'te' ? ', ' : ' · ') : (language === 'te' ? 'పరిశీలన అవసరం' : 'Needs attention');
}

export function statusLabel(status: string, language: 'en' | 'te'): string {
  const labels: Record<string, [string, string]> = {
    IDLE: ['Idle', 'ఖాళీగా ఉంది'],
    UNDER_PREPARATION: ['Under preparation', 'సిద్ధం చేస్తున్నారు'],
    STOCKED: ['Stocked', 'విత్తనాలు వేశారు'],
    HARVESTING: ['Harvesting', 'కోత జరుగుతోంది'],
    CLOSED: ['Closed', 'మూసివేశారు'],
    ACTIVE: ['Active', 'చురుకుగా ఉంది'],
  };
  return labels[status]?.[language === 'te' ? 1 : 0] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function attentionStateLabel(state: string, language: 'en' | 'te'): string {
  const labels: Record<string, [string, string]> = {
    GREEN: ['Good', 'సరే'],
    AMBER: ['Needs attention', 'పరిశీలన అవసరం'],
    RED: ['Urgent attention', 'తక్షణ పరిశీలన'],
  };
  return labels[state]?.[language === 'te' ? 1 : 0] ?? state;
}
