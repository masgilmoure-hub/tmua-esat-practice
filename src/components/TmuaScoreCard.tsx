import { ExternalLink } from 'lucide-react';
import type { Result } from '../types';
import { useI18n } from '../i18n';
import { TMUA_SCORING_URL, tmuaScoreEstimate } from '../tmuaScoring';

export function TmuaScoreCard({ result }: { result: Result }) {
  const { t } = useI18n();
  const estimate = tmuaScoreEstimate(result);
  if (!estimate) return null;
  const scope = estimate.scope === 'overall' ? t('两卷总分', 'Overall') : estimate.scope === 'p1' ? 'Paper 1' : 'Paper 2';
  return <section className="panel tmua-score-card" aria-label={t('预估分数', 'Estimated score')}>
    <div className="tmua-score-summary"><div><h2>{t('预估分数', 'Estimated score')}</h2><p className="small muted">TMUA {estimate.year} · {scope} · {t('当年官方换算', 'Historical official conversion')}</p></div>
      <div className="tmua-score-value"><strong>{estimate.score.toFixed(1)}</strong><span>/ 9</span></div>
    </div>
    <p className="tmua-score-calculation">{t(`原始分 ${estimate.rawMark} / ${estimate.total} → ${estimate.year} 年${scope}换算表`, `Raw mark ${estimate.rawMark} / ${estimate.total} → ${estimate.year} ${scope} conversion table`)}</p>
    <p className="small muted">{t(`少 / 多答对 1 题，对应 ${estimate.lower.toFixed(1)}–${estimate.upper.toFixed(1)}。这是题数变化区间，不是成绩预测的置信区间。`, `One fewer / extra correct answer gives ${estimate.lower.toFixed(1)}–${estimate.upper.toFixed(1)}. This is sensitivity to the raw mark, not a prediction confidence interval.`)}</p>
    <p className="small muted">{t('此为本套历年卷的历史尺度，不能直接预测现行 TMUA 官方成绩。', 'This uses this past paper’s historical scale and does not predict a current official TMUA result.')}{!estimate.timed ? t(' 本次不限时，换算仅供练习复盘。', ' This attempt was untimed; the conversion is for practice review only.') : ''}</p>
    <div className="tmua-score-links"><a href={estimate.sourceUrl} target="_blank" rel="noreferrer">{estimate.sourceKind === 'official-foi-response' ? t('官方回函与换算表', 'Official response and conversion table') : t('历史换算表（镜像）', 'Historical conversion table (mirror)')}<ExternalLink size={13} /></a><a href={TMUA_SCORING_URL} target="_blank" rel="noreferrer">{t('现行评分说明', 'Current scoring explained')}<ExternalLink size={13} /></a></div>
  </section>;
}
