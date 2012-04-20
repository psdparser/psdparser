$(document).ready(function () {
  var dropZone = $("#psd-drop").get(0);
  var psd;

  PSD.DEBUG = false;

  var handleDragOver = function (e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  var handleFile = function (e) {
    e.stopPropagation();
    e.preventDefault();

    var file = e.dataTransfer.files[0];

    $("#read-status > .alert")
      .removeClass()
      .addClass('alert alert-success')
      .html("PSD loaded. Parsing...");

    var reader = new FileReader();

    reader.onload = function (f) {
      var bytes = new Uint8Array(f.target.result);

      // Parse the PSD
      psd = new PSD(bytes);

      try {
        psd.parse();
      } catch (e) {
        console.log(e);
        $("#read-status > .alert")
          .removeClass()
          .addClass('alert alert-error')
          .html("ERROR: could not read PSD file due to a parsing error. This is a bug.")
      }

      if ($("#read-status > .alert").hasClass('alert-error')) {
        $("#read-status > .alert").html("Finished, but with errors. This is a bug.");
      } else {
        $("#read-status > .alert").html("Finished parsing!")
      }

      var image = $("<img />").attr('src', psd.toImage());
      image.bind('load', function () { 
        var pageWidth = $("#result > img").width();
        var pageHeight = $("#result > img").height();

        var xFactor = pageWidth / psd.header.cols;
        var yFactor = pageHeight / psd.header.rows;

        var layerPath = [];
        for (var i = 0, _ref = psd.layers.length; i < _ref; i++) {
          var layer = psd.layers[i];
          if (layer.isFolder) {
            layerPath.push(layer.name);
            continue;
          } else if (layer.isHidden) {
            layerPath.pop();
            continue;
          }

          // For demo purposes
          if (layer.width >= psd.header.cols) {
            continue;
          } else if (layer.height >= psd.header.rows) {
            continue;
          }

          layerPath.push(layer.name);

          $("<div />")
            .addClass('layer')
            .css({
              top: (layer.top * yFactor) + "px",
              left: (layer.left * xFactor) + "px",
              width: (layer.width * xFactor) + "px",
              height: (layer.height * yFactor) + "px"
            })
            .data('name', JSON.stringify(layerPath))
            .prependTo("#result")

          layerPath.pop();
        }
      });

      $("#result").html(image);
    };

    reader.readAsArrayBuffer(file);
  };

  dropZone.addEventListener("dragover", handleDragOver, false);
  dropZone.addEventListener("drop", handleFile, false);

  $("#result .layer").live('mouseover', function () {
    var path = JSON.parse($(this).data('name'));
    $("#path").empty();

    for (var i = 0; i < path.length; i++) {
      var item = path[i];
      if (i != path.length - 1) {
        item += " <span class=\"divider\">&raquo;</span>";
      }

      $("<li />")
        .html(item)
        .appendTo("#path");
    }
  });
});