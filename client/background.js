var video_url;
var video_id;
var video_time;
var video_name;

function youtubeParser(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

function clearStorage() {

    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
    });
}

chrome.commands.onCommand.addListener(function(command) {

    chrome.tabs.query({
            'active': true,
            'windowId': chrome.windows.WINDOW_ID_CURRENT
        },
        function(tabs) {
            // TODO:(shelbyt): Do we have to  cover an edge case
            // in case someone tries to use the hotkey on the chome
            // developer page or some other page like chrome-extension
            // for which we explictly do NOT have permissions for? Right now
            // this just throws an exception and nothing happens which is OK.
            video_url = tabs[0].url;
            video_id = youtubeParser(video_url);
            if (typeof(video_id) !== 'undefined' && video_id !== false) {

                var time = [];
                var stamp;

                var storage = chrome.storage.local;

                chrome.tabs.executeScript(null, {
                    file: "jquery-3.1.0.min.js"
                }, function() {
                    chrome.tabs.executeScript(null, {
                            file: "inject.js"
                        },
                        function(test) {

                            var build_youtube_api = "https://www.googleapis.com/youtube/v3/videos?id=" + video_id + "&key=AIzaSyAq35uqJa3xJm2MN72bk2mSPobkMketxfk&part=snippet";
                            console.log(build_youtube_api);

                            $.ajax({
                                async: false,
                                dataType: "json",
                                url: build_youtube_api,
                                success: function(data) {
                                    if (typeof(data.items[0]) != "undefined") {
                                        console.log('video exists ' + data.items[0].snippet.title);
                                        video_name = data.items[0].snippet.title;
                                        console.log(video_name);
                                    } else {
                                        console.log('video not exists');
                                    }
                                }
                            });
                            time.push(test);
                            stamp = time[0][0];
                            video_time = stamp;


                            console.log("before post");
                            jQuery.ajax({
                                type: "POST",
                                dataType: "json",
                                async: true,
                                contentType: "application/json; charset=utf-8",
                                url: "http://127.0.0.1:5000/",
                                data: JSON.stringify({
                                    "time": video_time,
                                    "id": video_id
                                }),

				//TODO(shelbyt): Double check edge cases
                                complete: function(data) {

                            chrome.storage.local.get(function(cfg) {
                                if (typeof(cfg[video_id]) !== 'undefined') {
                                    cfg[video_id].ticks.push(stamp);
                                    cfg[video_id].notes.push(data.responseText);
                                } else {
                                    var initialize_struct = {
                                        video_name: video_name,
                                        ticks: [stamp],
				        notes: [data.responseText]
                                    }
                                    cfg[video_id] = initialize_struct;
                                    console.log(cfg);
                                }

				// DONT FORGET TO SET STORAGE AFTER WRITING
                                chrome.storage.local.set(cfg);
                                console.log(cfg);

                            });

                                    //console.log(data);
				    //note_text = data.responseText
				    //console.log("len of notes = " + cfg[video_id].notes.length)
			            //cfg[video_id].notes.push(data.responseText);
			            //console.log(cfg);
                                },

                                success: function(data) {
                                    console.log(data);
                                }
                            });

                        });
                });

                console.log("after post");

                function callback(bytes) {
                    console.log("Total bytes in use: " + bytes);
                }
                storage.getBytesInUse(null, callback);


                Storage.showTotalBytes = function() {
                    function callback(bytes) {
                        console.log("Total bytes in use: " + bytes);
                    }
                    if (arguments.length == 0) {
                        console.log("0 arguments");
                        return chrome.storage.local.getBytesInUse(null, callback);
                    } else {

                        console.log("more arguments");
                        var ary = arguments.slice();
                        ary.push(callback);
                        return chrome.storage.local.getBytesInUse.apply(null, ary);
                    }
                };
            }
        });
});
