+++
title = "Details Include Test"
+++

## Default detailsPattern and metadataDetailName=false

<div id="inc_default" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern=".*" fieldNames="author" metadataDetailName="false"> </div>

## Filtered top-level detailsPattern (Detail Beta)

<div id="inc_beta" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Detail Beta"> </div>

## Filtered nested detailsPattern (Nested Child)

<div id="inc_nested" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Nested Child"> </div>

## Filtered metadata detail (Custom Meta)

<div id="inc_meta" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Custom Meta" metadataDetailName="Custom Meta"> </div>

## Filtered HTML detailsPattern (Beta HTML)

<div id="inc_html_beta" class="js_include" url="../details_html_source/" newLevelForH1="4" includeTitle="false" detailsPattern="Beta HTML"> </div>
