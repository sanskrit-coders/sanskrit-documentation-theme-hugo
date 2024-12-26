export function get_youtube_id(url) {
    var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    return (url.match(p)) ? RegExp.$1 : false;
}

export async function vimeoEmbed(url, el) {
    let id = false;
    try {
        const response = await fetch(`https://vimeo.com/api/oembed.json?url=${url}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data.video_id) {
            id = data.video_id;
            const autoplay = url.indexOf('autoplay=1') !== -1 ? 1 : 0;
            const loop = url.indexOf('loop=1') !== -1 ? 1 : 0;
            let theInnerHTML = `<iframe src="https://player.vimeo.com/video/${id}/?byline=0&title=0&portrait=0`;
            if (autoplay == 1) theInnerHTML += '&autoplay=1';
            if (loop == 1) theInnerHTML += '&loop=1';
            theInnerHTML += '" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
            el.innerHTML = theInnerHTML;
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

export function videoEmbed(videoEmbedTag) {
    //check if this is an external url (that starts with https:// or http://
    if (videoEmbedTag.getAttribute("src").indexOf("http://") == 0 ||
        videoEmbedTag.getAttribute("src").indexOf("https://") == 0) {
        var youtube_id = get_youtube_id(videoEmbedTag.getAttribute("src"));
        if(youtube_id) {
            if(videoEmbedTag.getAttribute("src").indexOf('autoplay=1') !== -1) var autoplay=1; else var autoplay=0;
            if(videoEmbedTag.getAttribute("src").indexOf('loop=1') !== -1) var loop=1; else var loop=0;
            var theInnerHTML = '<iframe width="720" height="420" src="https://www.youtube.com/embed/' + youtube_id + '?rel=0&showinfo=0';
            if(autoplay==1) theInnerHTML += '&autoplay=1';
            if(loop==1) theInnerHTML += '&loop=1&playlist='+youtube_id+'&version=3';
            theInnerHTML += '" frameborder="0" allowfullscreen></iframe>';
            videoEmbedTag.innerHTML = theInnerHTML;
        }
        if(videoEmbedTag.getAttribute("src").indexOf('vimeo.com') !== -1) {
            //ask vimeo for the id and place the embed
            vimeoEmbed(videoEmbedTag.getAttribute("src"),videoEmbedTag);
        }
    }
}

export function fillVideoEmbeds(node) {
    var videoEmbedTags = [...node.querySelectorAll('.videoEmbed')];
    videoEmbedTags.forEach(function (videoEmbedTag) {
        videoEmbed(videoEmbedTag);
    });
}
