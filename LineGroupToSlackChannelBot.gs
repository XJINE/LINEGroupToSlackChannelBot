// ABOUNT:
// This is a bot to bridge Slack channel and LINE group.

// NOTE:
// LINE-API.
// https://developers.line.me/ja/docs/messaging-api/reference/
// GAS-API.
// https://developers.google.com/apps-script/reference/

// NOTE:
// (1) Make a LINE-Bot & Set this GAS.
// (2) Invite the LINE-Bot to your LINE-Group. Not Talk-Room.
// (3) Receive 'groupId' message from LINE-Bot. [^1]
// (4) Update spreadsheet. Write 'groupId' and the related Slack-Channel id(=name) without '#'.[^1]
// (5) Post your message.
//
// [^1] LINE-Group name (or any similar info) cannot get from API.
// So we can't define a linked slack channel name from LINE or Bot.

// NOTE:
// - SLACK_API_TOKEN pass a test with Legacy-Token.
// - LINE_API_TOKEN means Channel-Access-Token.
// - SPREADSHEET_URL EX.
// -- https://docs.google.com/spreadsheets/d/_SPREADSHEET_ID_/edit

var SLACK_API_TOKEN = '';
var LINE_API_TOKEN  = '';
var SLACK_USER_NAME = 'LINE_TO_SLACK_BOT';
var SPREADSHEET_URL = '';

function doPost(e)
{
    JSON.parse(e.postData.contents).events.forEach(function(event)
    {
        var replyToken = event.replyToken;

        if (typeof replyToken === 'undefined')
        {
            return;
        }

        // NOTE:
        // Notify groupId to link Slack channel when this bot was joined LINE-Group.

        if(event.type === 'join')
        {
            replyToLineGroup(replyToken,
                             "Update Spreadsheet to link Slack channel.\n"
                             + "[LINE_GROUP_ID: " + event.source.groupId + "]\n"
                             + "[SPREADSHEET: " + SPREADSHEET_ID + "]");
        }
        else
        {
            var userName  = getLineUserName(event.source.userId);
            var channelId = getSlackChannelId(event.source.groupId);
            var message   = "[FROM:" + userName + "]\n " + event.message.text;

            if(channelId === null)
            {
                replyToLineGroup(replyToken,
                                 "LINE_GROUP_ID or SLACK_CHANNEL_ID not found in Spreadsheet. You need to check settings.\n"
                                 + "[LINE_GROUP_ID: " + event.source.groupId + "]\n"
                                 + "[SPREADSHEET: " + SPREADSHEET_URL + "]");
                return;
            }

            postToSlack(channelId, SLACK_USER_NAME, message);
        }
    });
}

function replyToLineGroup(replyToken, message)
{
    var postData =
    {
        "replyToken" : replyToken,
        "messages" :
        [{
          "type" : "text",
          "text" : message
        }]
    };

    var params =
    {
        "method"  : "post",
        "headers" :
        {
            "Content-Type" : "application/json;",
            "Authorization" : "Bearer " + LINE_API_TOKEN
        },
        "payload" : JSON.stringify(postData)
    };

    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", params);
}

function getLineUserName(userId)
{
    try
    {
        var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + userId,
        {
            'headers':
            {
                'Content-Type': 'application/json;',
                'Authorization': 'Bearer ' + LINE_API_TOKEN,
            }
        });
    }
    catch(e)
    {
        return "UNKNOWN : " + e;
    }

    return JSON.parse(response.getContentText())["displayName"];
}

function getSlackChannelId(groupId)
{
    // NOTE:
    // This function consider the following Spreadsheet.
    // | - |    A    |     B     |
    // | 1 | groupId | channelId |

    var sheet   = SpreadsheetApp
                 .openByUrl(SPREADSHEET_URL)
                 .getSheets()[0];
    var lastRow = sheet.getLastRow();
    var range   = sheet.getRange(1, 1, lastRow, 2);
    var values  = range.getValues();

    for (var i = 0; i < lastRow; i++)
    {
        if(values[i][0] === groupId)
        {
            return values[i][1];
        }
    }

    return null;
}

function postToSlack(channelId, userName, text)
{
     // CAUTION:
     // Need to use payload type implement
     // because some special character like '&' or any others will makes error.

     var payload =
     {
        "channel"    : channelId,
        "username"   : userName,
        "link_names" : true,
        "text"       : text
     };
     var parameters =
     {
       "method"  : "POST",
       "payload" : payload
     };

     UrlFetchApp.fetch("https://slack.com/api/chat.postMessage?token=" + SLACK_API_TOKEN, parameters);
}
