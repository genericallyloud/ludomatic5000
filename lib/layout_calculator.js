"use strict";
function findBestOption(options){
    var portraitOption = layoutOption(true, options);
    var landscapeOption = layoutOption(false, options);
    
    return portraitOption.total > landscapeOption.total? portraitOption : landscapeOption;
}

function layoutOption(portrait, options){
    var pageWidth = portrait?options.pageWidth:options.pageHeight;
    var pageHeight = portrait?options.pageHeight:options.pageWidth;
    var layoutResult = {
        colCount: countForConstraints(pageWidth, options.margin, options.componentWidth),
        rowCount: countForConstraints(pageHeight, options.margin, options.componentHeight),
    }
    layoutResult.total = layoutResult.colCount * layoutResult.rowCount;
    return layoutResult; 
}

function countForConstraints(pageSize, margin, componentSize){
    var usableSize = pageSize - (margin * 2);
    return Math.floor(usableSize/componentSize);
}


exports.findBestOption = findBestOption;
