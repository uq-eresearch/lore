var TEST_XPATH_1 = 'xpointer(string-range(/html[1]/body[1]/div[1]/p[3], "", 92, 21))';
var TEST_XPATH_2 = 'xpointer(start-point(string-range(/html[1]/body[1]/div[2]/p[2], "", 143, 1))/range-to(end-point(string-range(/html[1]/body[1]/div[2]/p[2], "", 188, 1))))';
var TEST_XPATH_3 = 'string-range(/html[1]/body[1]/div[1]/p[3], "", 92, 21)';
var TEST_XPATH_4 = 'xpointer(/html[1]/body[1]/div[1]/p[3])';
var TEST_XPATH_5 = '/html[1]/body[1]/div[1]/p[3]';
var TEST_XPATH_6 = 'GARBAGE';
var TEST_XPATH_7 = 'xpointer(/html[1]/body[1])';

var TEST_VALID_XPATH = 'xpointer(string-range(/html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/h1[1], "", 4, 5))';
var TEST_VALID_XPATH_LORECOMMON = 'xpointer(start-point(string-range(/html[1]/body[1]/div[1]/p[3], "", 134, 1))/range-to(end-point(string-range(/html[1]/body[1]/div[1]/p[3], "", 234, 1))))';
var TEST_VALID_XPATH_LORECOMMON_2 = 'xpointer(start-point(string-range(/html[1]/body[1]/div[8]/p[2], "", 185, 1))/range-to(end-point(string-range(/html[1]/body[1]/div[8]/p[2], "", 333, 1))))';


function testVariationMarkers() {
  if (consoleDebug) console.debug('[testVariationMarkers() begin]');
  var sourceFrame = document.getElementById("variationSourceFrame");
  
  lore.util.highlightXPointer(TEST_VALID_XPATH_LORECOMMON, sourceFrame.contentDocument, false);
  lore.util.highlightXPointer(TEST_VALID_XPATH_LORECOMMON_2, sourceFrame.contentDocument, true);
  
  if (consoleDebug) console.debug('[testVariationMarkers() end]');
}

function testParse() {
  if (consoleDebug) console.debug('[testParse() begin]'); 
  var sourceFrame = document.getElementById('variationSourceFrame');
  var targetFrame = document.getElementById('variationTargetFrame');
  
  if (consoleDebug) console.debug('Retrieved variation frame handles.');

  if (targetFrame.contentDocument) {
    if (consoleDebug) console.debug('Target frame has content document.');
  }
  // var sel = lore.m_xps.parseXPointerToRange(TEST_VALID_XPATH, document);
  var sel = lore.m_xps.parseXPointerToRange(TEST_XPATH_4, targetFrame.contentDocument);
  
  if (consoleDebug) console.debug('Parse result: ');
  if (consoleDebug) console.debug(sel);
  if (consoleDebug) console.debug('[testParse() end]');
}
