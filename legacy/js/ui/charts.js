function showLineChartTooltip(node,event){
  let tooltip=document.getElementById('line-chart-tooltip');
  if(!tooltip){
    tooltip=document.createElement('div');
    tooltip.id='line-chart-tooltip';
    tooltip.className='line-chart-tooltip';
    tooltip.setAttribute('role','status');
    document.body.appendChild(tooltip);
  }
  const svg=node.closest('svg');
  const chartIndex=node.getAttribute('data-chart-index');
  const periodPoints=svg && chartIndex!==null ? [...svg.querySelectorAll(`[data-chart-index="${chartIndex}"]`)] : [];
  tooltip.textContent=periodPoints.length
    ? periodPoints.map(point=>point.getAttribute('data-chart-tooltip')).filter(Boolean).filter((value,index,values)=>values.indexOf(value)===index).join('\n')
    : (node.getAttribute('data-chart-tooltip')||'');
  tooltip.hidden=false;
  document.querySelectorAll('.chart-crosshair').forEach(line=>{ line.hidden=true; });
  const crosshair=svg?.querySelector('.chart-crosshair');
  if(crosshair){
    const x=node.getAttribute('data-chart-x');
    crosshair.setAttribute('x1',x); crosshair.setAttribute('x2',x); crosshair.hidden=false;
  }
  const rect=node.getBoundingClientRect();
  const x=event?.clientX||rect.left+rect.width/2;
  const y=event?.clientY||rect.top;
  const chart=node.closest('.dashboard-patrimony-chart');
  tooltip.classList.toggle('dashboard-chart-tooltip',!!chart);
  const bounds=chart?.getBoundingClientRect();
  const minX=bounds ? bounds.left+8 : 8;
  const maxX=bounds ? Math.max(minX,bounds.right-228) : window.innerWidth-228;
  const minY=bounds ? bounds.top+8 : 8;
  tooltip.style.left=`${Math.max(minX,Math.min(maxX,x+10))}px`;
  tooltip.style.top=`${Math.max(minY,y-42)}px`;
}
function hideLineChartTooltip(){
  const tooltip=document.getElementById('line-chart-tooltip');
  if(tooltip) tooltip.hidden=true;
  document.querySelectorAll('.chart-crosshair').forEach(line=>{ line.hidden=true; });
}
function lineChart(series, labels, chartClass='', valueFormatter=fmtP){
  const dashboardChart=chartClass==='dashboard-patrimony-chart';
  const compactChart=dashboardChart && innerWidth<=767;
  const width=dashboardChart?(compactChart?360:760):1080;
  const height=dashboardChart?(compactChart?142:198):260;
  const padL=dashboardChart?(compactChart?67:72):50, padR=18, padT=14, padB=28;
  const validValue=v=>typeof v==='number' && Number.isFinite(v);
  const all=series.flatMap(s=>(s.values||[]).filter(validValue));
  if(!all.length) return '<div class="es" style="padding:36px 18px">Sem dados suficientes para desenhar o gráfico.</div>';
  let minY=Math.min(0,...all);
  let maxY=Math.max(0,...all);
  if(minY===maxY){ maxY=minY+1; }
  const span=maxY-minY;
  const extra=Math.max(2, span*0.12);
  minY=minY<0?minY-extra:0; maxY+=extra;
  const xStep=(width-padL-padR)/Math.max(1, labels.length-1);
  const yAt=v=>height-padB-(((v-minY)/(maxY-minY))*(height-padT-padB));
  const xAt=i=>padL + i*xStep;

  // Respect hideValues for tooltips and accessible text
  const hideValues = typeof S !== 'undefined' && S.hideValues;
  const safeFormatter = hideValues ? () => 'R$ ••••' : valueFormatter;

  const chartTooltips=labels.map((label,i)=>series.map(s=>{
    if(!Array.isArray(s.values) || i>=s.values.length) return '';
    const value=s.values[i];
    if(!validValue(value)) return '';
    const name=s.tooltipLabel||s.name||'Série';
    return `${label}\n${name}\n${safeFormatter(value)}`;
  }).filter(Boolean).join('\n'));
  const grid=[];
  for(let i=0;i<=5;i++){
    const y=padT + ((height-padT-padB)/5)*i;
    const value=maxY - ((maxY-minY)/5)*i;
    grid.push(`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width-padR}" y2="${y.toFixed(1)}" stroke="#161e2e" stroke-width="1"/>`);
    grid.push(`<text x="${padL-8}" y="${(y+4).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="10">${safeFormatter(value)}</text>`);
  }
  const paths=series.map((s,idx)=>{
    const color=s.color||CLRS[idx%CLRS.length];
    const values=s.values||[];
    if(!values.length) return '';
    const runs=[];
    let run=[];
    values.forEach((value,i)=>{
      if(validValue(value)) run.push({value,i});
      else if(run.length){runs.push(run);run=[];}
    });
    if(run.length) runs.push(run);
    const pathsMarkup=runs.map(points=>{
      const pts=points.map(({value,i})=>`${xAt(i).toFixed(1)},${yAt(value).toFixed(1)}`);
      const path=`M ${pts.join(' L ')}`;
      const area=points.length>1?`M ${xAt(points[0].i).toFixed(1)},${(height-padB).toFixed(1)} L ${pts.join(' L ')} L ${xAt(points[points.length-1].i).toFixed(1)},${(height-padB).toFixed(1)} Z`:'';
      return `${area&&s.fill?`<path d="${area}" fill="${s.fill}"/>`:''}<path d="${path}" fill="none" stroke="${color}" stroke-width="${s.width||2.2}" stroke-linecap="round" stroke-linejoin="round"><title>${esc(s.name||'Série')}</title></path>`;
    }).join('');
const pointsMarkup=values.map((v,i)=>{
      if(!validValue(v)) return '';
      const label=labels[i]||`Período ${i+1}`;
      const tooltip=chartTooltips[i] || (s.tooltipLabel ? `${label}\n${s.tooltipLabel}\n${safeFormatter(v)}` : `${s.name||'Série'} · ${label}: ${safeFormatter(v)}`);
      const visible=s.points===false?'':`<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="2.5" fill="${color}" stroke="#090c15" stroke-width="1"/>`;
      return `${visible}<circle class="chart-data-point" cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="8" fill="transparent" tabindex="0" focusable="true" aria-label="${esc(tooltip)}" data-chart-index="${i}" data-chart-x="${xAt(i).toFixed(1)}" data-chart-tooltip="${esc(tooltip)}" onpointerenter="showLineChartTooltip(this,event)" onpointermove="showLineChartTooltip(this,event)" onpointerleave="hideLineChartTooltip()" onfocus="showLineChartTooltip(this,event)" onblur="hideLineChartTooltip()" onclick="showLineChartTooltip(this,event)"><title>${esc(tooltip)}</title></circle>`;
    }).join('');
    return `
      ${pathsMarkup}
      ${pointsMarkup}
    `;
  }).join('');
  const labelStep=Math.max(1, Math.ceil(labels.length/(compactChart?4:8)));
  const xLabels=labels.flatMap((l,i)=>i%labelStep===0||i===labels.length-1?[`<text x="${xAt(i).toFixed(1)}" y="${height-10}" text-anchor="middle" fill="#64748b" font-size="10">${esc(l)}</text>`]:[]).join('');
  const classAttr=chartClass ? ` class="${chartClass}"` : '';
  const preserveAttr=chartClass ? ' preserveAspectRatio="none"' : '';
  const chartId=`chart-${String(chartClass||'series').replace(/[^a-zA-Z0-9_-]+/g,'-')}-${labels.length}`;
  const firstLabel=labels[0]||'primeiro período';
  const lastLabel=labels[labels.length-1]||'último período';
  const firstSeries=series[0]||{};
  const firstValue=Array.isArray(firstSeries.values)&&validValue(firstSeries.values[0])?safeFormatter(firstSeries.values[0]):'sem dado';
  const lastValue=Array.isArray(firstSeries.values)&&validValue(firstSeries.values[firstSeries.values.length-1])?safeFormatter(firstSeries.values[firstSeries.values.length-1]):'sem dado';
  const gapLabels=(firstSeries.values||[]).flatMap((v,i)=>validValue(v)?[]:[labels[i]||`período ${i+1}`]);
  const chartSummary=`${firstSeries.name||firstSeries.tooltipLabel||'Série principal'}: ${firstLabel}, ${firstValue}; ${lastLabel}, ${lastValue}.${gapLabels.length?` Intervalo sem dados: ${gapLabels.join(', ')}.`:''}`;
  return `<svg${classAttr} role="img" aria-labelledby="${chartId}-title ${chartId}-desc" viewBox="0 0 ${width} ${height}" width="100%" height="${height}"${preserveAttr} style="display:block;overflow:visible">
    <title id="${chartId}-title">${esc(firstSeries.name||firstSeries.tooltipLabel||'Gráfico de evolução')}</title>
    <desc id="${chartId}-desc">${esc(chartSummary)}</desc>
    ${grid.join('')}
    <line class="chart-crosshair" x1="${padL}" y1="${padT}" x2="${padL}" y2="${height-padB}" stroke="var(--muted,#64748b)" stroke-width="1" stroke-dasharray="3 4" hidden/>
    ${paths}
    ${xLabels}
  </svg>`;
}

function showDividendChartTooltip(point){
  const wrap=point?.closest?.('.dividend-chart-wrap');
  const tooltip=wrap?.querySelector?.('.dividend-chart-tooltip');
  if(!tooltip) return;
  tooltip.textContent=point.dataset.tooltip||point.getAttribute('aria-label')||'';
  tooltip.hidden=false;
  const pointRect=point.getBoundingClientRect();
  const wrapRect=wrap.getBoundingClientRect();
  const maxLeft=Math.max(6,wrapRect.width-tooltip.offsetWidth-6);
  tooltip.style.left=`${Math.min(maxLeft,Math.max(6,pointRect.left-wrapRect.left+pointRect.width/2-tooltip.offsetWidth/2))}px`;
  tooltip.style.top=`${Math.max(6,pointRect.top-wrapRect.top-tooltip.offsetHeight-8)}px`;
}
function hideDividendChartTooltip(point){
  const tooltip=point?.closest?.('.dividend-chart-wrap')?.querySelector?.('.dividend-chart-tooltip');
  if(tooltip && document.activeElement!==point && point?.dataset?.tooltipPinned!=='true') tooltip.hidden=true;
}
