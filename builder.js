var fs = require("fs");
var https = require("https");
var moment = require("moment");
var md = require("markdown-it");
var urlParser = require("url");
var handlebars = require("handlebars");
var highlight = require("highlight.js");
var q = require("q");
var posts = fs.readFileSync("posts.json").toString();
var baseURL = "https://api.github.com";
var postTemplate = fs.readFileSync("post.template.html").toString();
var indexTemplate = fs.readFileSync("index.template.html").toString();
var template = handlebars.compile(postTemplate);
var postList = [];
var markdown = new md("commonmark", {
  html: true,
  typographer: true,
  highlight: function (str, lang) {
    console.log("trying to highlight", lang)
    if (lang && highlight.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               highlight.highlight(lang, str, true).value +
               '</code></pre>'
      } catch (__) { console.log(__)}
    }

    return ''; // use external default escaping
  }
});
var postPromises = [];
posts = JSON.parse(posts);
posts.posts.reverse();

posts.posts.forEach(function(postID, index){
  var path = baseURL+"/gists/"+postID;
  var promise = q.defer();
  postPromises.push(promise.promise);
  Get(path, function(res){
    var files = Object.keys(res.files);
    var fileName = files[0];
    var html = markdown.render(res.files[fileName].content);
    var result = template({
      post_title: res.description,
      post_content: html,
      created: moment(res.created_at).format("LL"),
      modified: moment(res.modified_at).format("LLL")
    });
    var savedName = res.description.replace(/ /g, "_").toLowerCase();
    var savedPath = "posts/"+savedName+".html";
    fs.writeFileSync(savedPath, result);
    var postResult = {
      title: res.description,
      link: savedPath,
      created: moment(res.created_at).format("LL"),
    }
    promise.resolve(postResult);
  });
});

q.all(postPromises).then((posts)=>{
  console.log(posts);
  buildIndexHTML(posts);
}).catch((e)=>{
  console.log(e);
});

function buildIndexHTML(postList){
 
  var index = handlebars.compile(indexTemplate);
  var indexHTML = index({posts: postList});

  fs.writeFileSync("index.html", indexHTML);
}


function Get(url, cb){
  var parts = urlParser.parse(url);

  var options = {
    hostname: parts.hostname,
    path: parts.path,
    headers:{
      "User-Agent": "Clay's Blog Bot"
    }
  }
  
  var req = https.get(options, function(res){
    var responseText = "";
    res.on("data", function(chunk){
      responseText += chunk;
    });
    res.on("end", function(){
      var response = JSON.parse(responseText);
      cb(response);
    })
  });
}
