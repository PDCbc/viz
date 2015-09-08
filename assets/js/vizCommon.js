/**
 * Created by sdiemert on 15-09-02.
 */

var colors = {
    blue : ['#1C2D3E', '#335579', '#4D83BD', '#65B0FF', '#A6D3FF', '#D0E7FF'],
    yellow : ['#2A1F0E', '#71521F', '#926927', '#D99B37', '#FDB53F', "#FECE7A"]
};

var graphOffsets = {top: 20};

// shared fonts
var fonts = {axisTickSize: 12, axisTitleSize: 14, legendSize: 14, pieMiddle:24};

// Color palette for visualizations
//

// ratio color palette
var colorMap = {clinician: colors.yellow[3], group: colors.blue[2], network: colors.blue[0]};
var colorMap2 = {clinician: colors.yellow[5], group: colors.blue[3], network: colors.blue[1]};
var fontColorMap = {clinician : "#000000", group : "#000000", network : "#ffffff"};
var inverseColorMap = {clinician: colors.blue[5], group: colors.blue[5], network:colors.blue[5]};

// demographics pyramid
var pyramidTooltipColorMap = {male: '#4D83BD', female: '#D99B37', undifferentiated: '#D0E7FF', undefined:'#FDB53F'};
var pyramidColorMap = {male: '#335579', female: '#926927', undifferentiated: '#FECE7A', undefined: '#A6D3FF'};


var formatTime = d3.time.format("%Y-%m-%d");
