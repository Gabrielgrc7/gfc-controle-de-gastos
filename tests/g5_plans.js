const H = require('./h');
(async () => {
  const { E, ok, R, signup } = await H.boot();
  await signup();
  const pad = (n) => String(n).padStart(2, '0');
  const dim = (y, m) =>
    [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      m - 1
    ];
  const cm = E('cmNow()'),
    [cy, cmo] = cm.split('-').map(Number);
  const add = (m, n) => {
    const t = +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1) + n;
    return Math.floor(t / 12) + '-' + pad((t % 12) + 1);
  };
  const run = E(
    '(function(plan){data=[];plans=[plan];materialize();return data.map(x=>({d:x.date,pn:x.pn,pt:x.pt,v:x.value,k:x.kind,inc:!!x.inc,gid:x.gid,pend:!!x.pend,bill:!!x.bill}))})'
  );
  let n = 0;
  for (let back = 0; back <= 13; back++)
    for (const day of [1, 15, 28, 29, 30, 31]) {
      const start = add(cm, -back),
        sd = start + '-' + pad(Math.min(day, dim(+start.slice(0, 4), +start.slice(5, 7))));
      for (const pt of [2, 6, 12]) {
        const r = run({
            gid: 'g',
            kind: 'p',
            desc: 'Notebook',
            value: 100,
            cat: 'Compras',
            day,
            start: sd,
            pn: 1,
            pt,
            active: true,
            skip: [],
          }),
          exp = Math.min(pt, back + 1);
        n++;
        ok(`parcelas ${sd} ${pt}x: quantidade`, r.length === exp, r.length + ' vs ' + exp);
        ok(
          `parcelas ${sd} ${pt}x: numeração sequencial`,
          r.every((x, i) => x.pn === i + 1 && x.pt === pt)
        );
        ok(
          `parcelas ${sd} ${pt}x: um por mês com dia correto`,
          r.every((x, i) => {
            const mm = add(start, i);
            return x.d === mm + '-' + pad(Math.min(day, dim(+mm.slice(0, 4), +mm.slice(5, 7))));
          })
        );
        ok(
          `parcelas ${sd} ${pt}x: nenhuma depois do mês atual`,
          r.every((x) => x.d.slice(0, 7) <= cm)
        );
      }
      for (const end of [null, -1, 0]) {
        const endM = end == null ? null : add(cm, end);
        const r = run({
          gid: 'r',
          kind: 'r',
          desc: 'Streaming',
          value: 39.9,
          cat: 'Lazer',
          day,
          start: sd,
          end: endM || undefined,
          active: true,
          skip: [],
        });
        const last = endM && endM < cm ? endM : cm,
          exp = Math.max(
            0,
            (+last.slice(0, 4) - +start.slice(0, 4)) * 12 + (+last.slice(5, 7) - +start.slice(5, 7)) + 1
          );
        n++;
        ok(`recorrente ${sd} fim ${endM}: quantidade`, r.length === exp, r.length + ' vs ' + exp);
        ok(
          `recorrente ${sd}: sem duplicar ao rodar de novo`,
          E('(function(){materialize();materialize();return data.length})()') === r.length
        );
      }
      // receita recorrente e conta a pagar
      const ri = run({
        gid: 'i',
        kind: 'r',
        desc: 'Salário',
        value: 5000,
        cat: 'Receita',
        day,
        start: sd,
        inc: true,
        active: true,
        skip: [],
      });
      n++;
      ok(`receita recorrente ${sd}: tudo marcado como receita`, ri.length > 0 && ri.every((x) => x.inc));
      const rb = run({
        gid: 'b',
        kind: 'r',
        desc: 'Aluguel',
        value: 900,
        cat: 'Moradia',
        day,
        start: sd,
        pend: true,
        active: true,
        skip: [],
      });
      n++;
      ok(
        `conta recorrente ${sd}: só o mês atual fica pendente`,
        rb.filter((x) => x.pend).length <= 1 &&
          rb.every((x) => x.bill) &&
          rb.filter((x) => x.d.slice(0, 7) < cm).every((x) => !x.pend)
      );
    }
  // meses pulados (skip) não voltam
  for (const back of [1, 2, 3, 5]) {
    const start = add(cm, -back),
      sd = start + '-10';
    const r = E(
      '(function(){data=[];plans=[{gid:"s",kind:"r",desc:"X",value:10,cat:"Lazer",day:10,start:"' +
        sd +
        '",active:true,skip:["' +
        add(start, 1) +
        '"]}];materialize();return data.map(x=>x.date.slice(0,7))})()'
    );
    n++;
    ok('skip respeitado (volta ' + back + ')', !r.includes(add(start, 1)) && r.length === back);
  }
  H.done('Parcelas e recorrências (geração mês a mês)', R, { cases: n });
})();
