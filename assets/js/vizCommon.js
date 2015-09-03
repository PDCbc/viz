/**
 * Created by sdiemert on 15-09-02.
 */

var graphOffsets = {top: 20};

// shared fonts
var fonts = {axisTickSize: 12, axisTitleSize: 14, legendSize: 14, pieMiddle:24};

// Color palette for visualizations
//

// ratio color palette
var colorMap = {clinician: '#D99B37', group: '#4D83BD', network: '#1C2D3E'};
var colorMap2 = {clinician: '#FDB53F', group: '#65B0FF', network: '#4D83BD'};
var inverseColorMap = {clinician: '#D0E7FF', group: "#D0E7FF", network: "#D0E7FF"};

// demographics pyramid
var pyramidTooltipColorMap = {male: '#4D83BD', female: '#D99B37', undifferentiated: '#D0E7FF', undefined:'#FDB53F'};
var pyramidColorMap = {male: '#335579', female: '#926927', undifferentiated: '#FECE7A', undefined: '#A6D3FF'};


var formatTime = d3.time.format("%Y-%m-%d");
