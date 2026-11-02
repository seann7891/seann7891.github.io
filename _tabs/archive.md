---
title: Archive
icon: fas fa-folder-open
order: 8
permalink: /archive/
description: 研習的簡報、錄影與雲端資料。
---

研習的簡報、錄影與雲端資料。

{% comment %}依 date 由新到舊排；沒填 date 的排最後{% endcomment %}
{% assign workshops = site.data.archive | sort: 'date', 'first' | reverse %}
<div class="archive-list">
{% for w in workshops %}
  <div class="archive-item">
    <h3>{{ w.title | escape }}</h3>
    <p class="archive-meta">
      {% if w.date %}{{ w.date | date: "%Y-%m-%d" }}{% endif %}
      {% if w.date and w.venue %} · {% endif %}
      {% if w.venue %}{{ w.venue | escape }}{% endif %}
    </p>
    {% if w.desc %}<p>{{ w.desc | escape }}</p>{% endif %}
    {% if w.url %}<a class="btn btn-outline-primary btn-sm" href="{{ w.url | escape }}" target="_blank" rel="noopener">開啟雲端資料</a>{% endif %}
    {% if w.links %}
    <ul class="archive-links">
      {% for l in w.links %}
      <li><a href="{{ l.url | escape }}" target="_blank" rel="noopener">{{ l.title | escape }}</a></li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
{% endfor %}
</div>

{% if site.data.archive.size == 0 %}
目前還沒有研習資料。
{% endif %}

<style>
.archive-item { padding: 1rem 0; border-bottom: 1px solid var(--main-border-color); }
.archive-item h3 { margin-top: 0; }
.archive-meta { font-size: .85rem; opacity: .7; margin-bottom: .5rem; }
.archive-links { margin-bottom: 0; }
</style>
