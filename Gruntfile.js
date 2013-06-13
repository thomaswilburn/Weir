module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-less");
  
  var options = {
    watch: {
      dev: {
        files: ["public/css/*.less"],
        tasks: ["less"],
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
    },
    concat: {
      dev: {
        src: [
          "public/js/Main.js",
          "public/js/Controller.Stream.js",
          "public/js/Controller.Settings.js",
          "public/js/Service.Events.js",
          "public/js/Service.LocalSettings.js",
          "public/js/Service.Request.js",
          "public/js/Service.Sanitize.js",
          "public/js/Service.Server.js"
        ],
        dest: "public/js/weir.js"
      }
    }
  }
  
  grunt.initConfig(options);
  
};
