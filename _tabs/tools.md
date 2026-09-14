---
title: Tools
icon: fas fa-toolbox
order: 5
permalink: /tools/
---

自製的小工具，全部在瀏覽器端執行，不上傳任何資料。

<div class="tool-list">
{% for t in site.data.tools %}
  <div class="tool-item">
    <h3 id="{{ t.slug }}">{{ t.title | escape }}</h3>
    <p>{{ t.desc | escape }}</p>
    {% if t.status == "wip" %}
      <span class="tool-wip">施工中</span>
    {% else %}
      {% assign tool_url = t.url %}
      {% unless tool_url %}{% assign tool_url = '/tools/' | append: t.slug | append: '/' | relative_url %}{% endunless %}
      <a class="btn btn-outline-primary btn-sm" href="{{ tool_url | escape }}">開啟</a>
    {% endif %}
  </div>
{% endfor %}
</div>

{% if site.data.tools.size == 0 %}
目前還沒有工具。
{% endif %}

<style>
.tool-item { padding: 1rem 0; border-bottom: 1px solid var(--main-border-color); }
.tool-item h3 { margin-top: 0; }
.tool-wip { font-size: .85rem; opacity: .6; }
</style>
