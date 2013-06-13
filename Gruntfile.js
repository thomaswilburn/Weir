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
    }
  }
  
  grunt.initConfig(options);
  
};
