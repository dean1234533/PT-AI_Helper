import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SITE,PUBLIC_PAGES} from '../src/seo/publicPages.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=resolve(process.env.BUILD_OUTPUT_DIR || join(root,'dist'));
const source=await readFile(join(root,'public/app-home.html'),'utf8');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const links=PUBLIC_PAGES.map(p=>`<a href="${SITE}/${p.slug}">${escape(p.title)}</a>`).join('');
const explore=`<section class="app-seo-explore"><h2>Explore the app</h2><nav aria-label="App features">${links}</nav></section>`;
const extraCss=`<style>body.app-seo-page{background:#0b0b0d;color:#ececef;--text:#ececef;--text-dim:#b3b3ba;--card:#151517;--border:rgba(255,255,255,.12);--accent:#c91515}.app-seo-page .app-seo-explore{background:#151517;border-radius:16px}.app-seo .db-btn-primary{padding:14px 22px;border-radius:10px;background:#c91515;color:#fff;text-decoration:none;font-weight:700;min-height:44px}.app-seo{max-width:1040px;margin:0 auto;padding:140px 24px 72px}.app-seo h1{font-family:Montserrat,sans-serif;font-size:clamp(2.1rem,5vw,3.8rem);line-height:1.1;max-width:880px;margin:24px 0;color:var(--text)}.app-seo h2,.app-seo-explore h2{font-family:Montserrat,sans-serif;line-height:1.25;font-size:1.5rem;margin:34px 0 16px}.app-seo p{line-height:1.8;color:var(--text-dim);max-width:800px}.app-seo .intro{font-size:1.12rem;margin-bottom:28px}.app-seo section{margin:36px 0}.app-seo details{padding:18px 20px;margin:12px 0;border:1px solid var(--border);border-radius:12px;background:var(--card)}.app-seo summary{font-weight:700;cursor:pointer}.app-seo details p{margin-top:14px}.app-seo-explore{background:#151517;color:#ececef;border-radius:16px;max-width:1040px;margin:0 auto;padding:24px}.app-seo-explore nav{display:flex;flex-wrap:wrap;gap:16px 24px}.app-seo-explore h2{color:#ececef}.app-seo-explore a{color:#b3b3ba;font-size:.95rem;line-height:1.6}.app-seo .db-btn-primary{display:inline-flex;margin:20px 12px 0 0}.app-seo .pricing-section{padding-top:30px}.app-seo .pricing-grid{margin:0}.app-seo a:focus-visible,.app-seo summary:focus-visible,.app-seo-explore a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}</style>`;
const nav=source.slice(source.indexOf('<nav class="db-nav"'),source.indexOf('<!-- Hero -->')).replaceAll('./logo.png','/logo.png');
const footer=source.slice(source.indexOf('<footer'),source.indexOf('</footer>')+9).replaceAll('./logo.png','/logo.png').replace('href="#pricing"',`href="${SITE}/pricing"`);
const pricingStart=source.indexOf('<section id="pricing"');const pricingEnd=source.indexOf('</section>',pricingStart)+10;
const pricing=source.slice(pricingStart,pricingEnd);
const checkoutStart=source.indexOf('<script>',pricingEnd);const checkout=source.slice(checkoutStart,source.indexOf('</script>',checkoutStart)+9);
function head(title,description,url,schema){return source.slice(0,source.indexOf('</head>')+7)
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
 .replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`)
 .replace(/<meta name="description" content="[^"]*"\s*\/?>/,`<meta name="description" content="${escape(description)}">`)
 .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/,`<link rel="canonical" href="${url}">`)
 .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/,`<meta property="og:title" content="${escape(title)}">`)
 .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/,`<meta property="og:description" content="${escape(description)}">`)
 .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/,`<meta property="og:url" content="${url}">`)
 .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/,`<meta name="twitter:title" content="${escape(title)}">`)
 .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/,`<meta name="twitter:description" content="${escape(description)}">`)
 .replaceAll('href="Styles/','href="/Styles/').replaceAll('href="logo.png"','href="/logo.png"').replaceAll('href="./pics/','href="/pics/')
 .replace('</head>',`${extraCss}<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head>`);}
const software={ '@type':'SoftwareApplication','@id':`${SITE}/#app`,name:"DB's Workouts",url:SITE+'/',applicationCategory:'HealthApplication',operatingSystem:'Web',description:'AI-assisted workout and nutrition planning with Personal access and PT Pro client coaching tools.',creator:{'@type':'Person',name:'Dean Burt',url:'https://dbworkouts.co.uk/about'}};
await mkdir(join(dist,'public-pages'),{recursive:true});
for(const page of PUBLIC_PAGES){const url=`${SITE}/${page.slug}`;const schema={'@context':'https://schema.org','@graph':[software,{'@type':'WebPage',url,name:page.title,description:page.description,inLanguage:'en-GB',dateModified:'2026-10-14',about:{'@id':`${SITE}/#app`}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:"DB's Workouts app",item:SITE+'/'},{'@type':'ListItem',position:2,name:page.title,item:url}]},{'@type':'FAQPage',mainEntity:page.faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}]};
const body=`${nav}<main class="app-seo"><p class="ai-eyebrow">DB’s Workouts app</p><h1>${escape(page.title)}</h1><p class="intro">${escape(page.intro)}</p><a class="db-btn-primary" href="${page.pricing?SITE+'/#pricing':SITE+'/pricing'}">${page.pricing?'View membership options':'Compare memberships'}</a><a class="db-btn-primary" href="${SITE}/login">Open your account</a>${page.pricing?pricing+checkout:''}${page.sections.map(([h,p])=>`<section><h2>${escape(h)}</h2><p>${escape(p)}</p></section>`).join('')}<section><h2>Frequently asked questions</h2>${page.faqs.map(([q,a])=>`<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</section>${page.sources?`<section><h2>Current provider information</h2><p>Reviewed 14 October 2026. Features and terms can change.</p><ul>${page.sources.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${escape(label)}</a></li>`).join('')}</ul></section>`:''}</main>${explore}${footer}<script src="/Script/cookie-consent.js" defer></script>`;
await writeFile(join(dist,'public-pages',page.slug+'.html'),head(`${page.title} | DB's Workouts`,page.description,url,schema)+`<body class="ai-plans-redesign app-seo-page">${body}</body></html>`);}
// Select the FAQ block by parsing scripts, rather than matching across unrelated graphs.
const faq=[...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(x=>x['@type']==='FAQPage');
const homeSchema={'@context':'https://schema.org','@graph':[software,{'@type':'WebSite',name:"DB's Workouts app",url:SITE+'/',inLanguage:'en-GB'},faq]};
const homeBody=source.slice(source.indexOf('</head>')+7).replace('<footer',explore+'<footer');
await writeFile(join(dist,'app-home.html'),head("AI Workout & Meal Planner UK | DB's Workouts",'Personalised AI workout and meal planning, weekly check-ins and PT Pro client coaching software. Built by Dean Burt, an East London personal trainer.',SITE+'/',homeSchema)+homeBody);
const paths=['/',...PUBLIC_PAGES.map(p=>'/'+p.slug)];
await writeFile(join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${SITE}${p}</loc><lastmod>2026-10-14</lastmod></url>`).join('')}</urlset>`);
await writeFile(join(dist,'_redirects'),`/ /app-home 200\n${PUBLIC_PAGES.map(p=>`/${p.slug} /public-pages/${p.slug} 200`).join('\n')}\n/* /index.html 200\n`);
await writeFile(join(dist,'llms.txt'),`# DB's Workouts app\n\nAI-assisted workout and nutrition planning for individuals, with PT Pro client coaching tools for personal trainers.\n\n${paths.map(p=>`- [${p==='/'?'App homepage':PUBLIC_PAGES.find(x=>'/'+x.slug===p).title}](${SITE}${p})`).join('\n')}\n\nOnly these marketing pages are public discovery content. Account, dashboard, client and check-in routes are not marketing resources. AI-generated suggestions require review and do not guarantee outcomes.\n`);
console.log(`Generated ${paths.length} public marketing URLs, sitemap and static routes.`);
