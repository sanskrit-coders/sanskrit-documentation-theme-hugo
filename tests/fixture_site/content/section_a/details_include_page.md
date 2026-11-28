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

## Filtered detailContentPattern only (Alpha body)

<div id="inc_content_only" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern=".*" detailContentPattern="Alpha body"> </div>

## Filtered detailsPattern and detailContentPattern match (Detail Beta + Inner leaf)

<div id="inc_both" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Detail Beta" detailContentPattern="Inner leaf"> </div>

## Filtered detailsPattern match but detailContentPattern miss

<div id="inc_both_miss" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Detail Beta" detailContentPattern="NO_SUCH_CONTENT"> </div>

## Filtered detailContentPattern anchored to nested child (^Inner leaf)

<div id="inc_anchored_child" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailContentPattern="^Inner leaf"> </div>

## Filtered before 2nd-order includes (TARGET_MARKER)

<div id="inc_nested_filter_order" class="js_include" url="../../test_data/details_nested_inc_parent.md" newLevelForH1="4" includeTitle="false" detailContentPattern="Beta bold body with TARGET_MARKER">
<details open><summary>Alpha</summary>
<div class="js_include" url="../../test_data/details_nested_inc_alpha.md">stale</div>
</details>
</div>

## Filtered nested path detailsPattern (सर्वाष् टीकाः.*/गङ्गानथ-मूलानुवादः.*)

<div id="inc_path_match" class="js_include" url="../../test_data/details_sarva_nested.md" newLevelForH1="4" includeTitle="false" detailsPattern="सर्वाष् टीकाः.*/गङ्गानथ-मूलानुवादः.*"> </div>

## Blockquote quote=0, quote=2, and collapsed quote=1

<div id="inc_quote_0" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Detail Alpha" quote="0"> </div>

<div id="inc_quote_2" class="js_include" url="../../test_data/details_sample.md" newLevelForH1="4" includeTitle="false" detailsPattern="Detail Alpha" quote="2"> </div>

<div id="inc_quote_collapsed" class="js_include collapsed" url="../../test_data/details_sample.md" newLevelForH1="4" title="Quoted Collapsed" detailsPattern="Detail Alpha" quote="1"> </div>
