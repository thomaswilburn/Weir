var browserify = require("browserify");
var fs = require("fs");

module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-less");
  
  var options = {
    watch: {
      css: {
        files: ["public/css/*.less"], // */ annoying nano syntax highlight bug
        tasks: ["less"],
        options: {
          nospawn: true
        }
      },
      js: {
        files: ["public/js/Main.js", "public/js/Controller.*.js", "public/js/Service.*.js"],
        tasks: ["browserify"],
        options: {
          nospawn: true
        }
      }
    },
    less: {
      dev: {
        files: {
          "public/css/rss.css": "public/css/rss.less"
        }
      } 
    }
  }
  
  grunt.initConfig(options);
  
  grunt.registerTask("default", ["watch"]);
  
  grunt.registerTask("build", "Create client-side files", ["browserify", "less"]);
  
  grunt.registerTask("cleanConfig", "Create commitable config file", function() {
  
    /*

    This script makes a copy of my configuration file with all personal information wiped out, 
    so I can change it as much as I want and still have an example for checking into source 
    control.
    
    It turns out, despite the stupid name, that JSON.stringify() already has a value replacer 
    built in. Handy!
    
    Running this script will also generate a package.json file, or update your existing package 
    with the current node_modules.
        
    */
    
    var cfg = require("./Config");
    var fs = require("fs");
    var path = require("path");
    
    var replacer = function(key, value) {
      if (key === "") return value;
      //specific keys
      switch (key) {
        case "type":
          //it's okay to say this is postgres
          return value;
        case "port":
          //let's provide a sane default
          return 8080;
        case "totp":
          //defaults to false
          return false;
      }
      //general sanitization
      switch (typeof value) {
        case "number": return value;
        case "string": return "";
        case "boolean": return value;
        case "function": return "f()";
        case "object":
          if (value instanceof Array) return [];
          return value;
      }
    }
    
    fs.writeFileSync("cfg-example.json", JSON.stringify(cfg, replacer, 2));
});

grunt.registerTask("credits", function() {
    /*
    
    Manual task that logs out a list of credits for the packages used, based on NPM 
    metadata. I place this in the Credits section of the settings dialog.

    */
    var fs = require("fs");
    var path = require("path");
    var credits = "";
    
    var package = {};
    if (fs.existsSync("package.json")) {
      package = JSON.parse(fs.readFileSync("package.json"))
    }
    var modules = Object.keys(package.dependencies);
    modules.forEach(function(mod) {
      var packagePath = path.join("./node_modules/", mod, "/package.json");
      if (fs.existsSync(packagePath)) {
        var modPackage = JSON.parse(fs.readFileSync(packagePath));
        package.dependencies[modPackage.name] = modPackage.version || "*";
        var site = modPackage.homepage;
        credits += "<li> "
        if (site) {
          credits += '<a href="' + site + '">';
        }
        credits += modPackage.name;
        if (site) {
          credits += "</a>";
        }
        credits += " - ";
        if (modPackage.author && modPackage.author.url) {
          credits += "<a href='" + modPackage.author.url + "'>";
          credits += modPackage.author.name;
          credits += "</a>";
        } else {
          credits += modPackage.author.name || modPackage.author;
        }
        credits += "\n";
      }
    });
    console.log(credits);
  });


  grunt.registerTask("browserify", function() {

    var done = this.async();

    var b = browserify({debug: true});
    var output = fs.createWriteStream("public/js/weir.js");
    b.add("public/js/Main.js");
    
    var bundle = b.bundle();
    bundle.on("error", done);
    
    bundle.pipe(output).on("finish", done);

  });

    
};
    
